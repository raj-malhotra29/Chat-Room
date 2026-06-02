import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { dbInstance } from './server-db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Check room availability
  app.get('/api/rooms/check/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = dbInstance.getRoom(code);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const allUsers = dbInstance.getUsersInRoom(room.id);
    const members = allUsers.filter(u => u.status === 'APPROVED');
    const isFull = members.length >= room.maxMembers;
    const admin = allUsers.find(u => u.role === 'ADMIN');

    return res.json({
      exists: true,
      roomCode: room.roomCode,
      currentMembers: members.length,
      maxMembers: room.maxMembers,
      isFull,
      adminName: admin ? admin.username : null
    });
  });

  // Create room
  app.post('/api/rooms', (req, res) => {
    const { username, roomCode, maxMembers } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    let code = roomCode ? roomCode.trim().toUpperCase() : '';
    if (!code) {
      // Auto-generate 6 hex-like room code
      code = 'RM-' + Math.random().toString(36).substring(3, 9).toUpperCase();
    }

    // Verify room code is clean
    if (!/^[A-Z0-9_-]{3,15}$/.test(code)) {
      return res.status(400).json({ error: 'Room code must be 3-15 alphanumeric characters.' });
    }

    const capacity = parseInt(maxMembers, 10);
    if (isNaN(capacity) || capacity < 2 || capacity > 50) {
      return res.status(400).json({ error: 'Maximum members must be between 2 and 50.' });
    }

    // Reuse/create room
    let room = dbInstance.getRoom(code);
    if (room) {
      const activeMembers = dbInstance.getUsersInRoom(room.id).filter(u => u.status === 'APPROVED');
      const adminUser = activeMembers.find(u => u.role === 'ADMIN');

      if (adminUser && adminUser.username.toLowerCase() === username.trim().toLowerCase()) {
        // Admin rejoining their own active room from Create form matches seamlessly
        return res.json({
          success: true,
          room,
          user: adminUser,
          message: 'Session resumed.'
        });
      }

      if (activeMembers.length > 0) {
        return res.status(400).json({ error: `Room ${code} is currently active. Please use another room code.` });
      }
      // If room was empty, reset limit
      dbInstance.updateRoomLimit(room.id, capacity);
    } else {
      room = dbInstance.createRoom(code, capacity);
    }

    // Create the creator user as APPROVED Admin
    const user = dbInstance.createUser(username.trim(), room.id, 'ADMIN', 'APPROVED');

    return res.json({
      success: true,
      room,
      user
    });
  });

  // Join room request (places in PENDING status)
  app.post('/api/rooms/join', (req, res) => {
    const { username, roomCode } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!roomCode || !roomCode.trim()) {
      return res.status(400).json({ error: 'Room code is required.' });
    }

    const normalizedCode = roomCode.trim().toUpperCase();
    const room = dbInstance.getRoom(normalizedCode);
    if (!room) {
      return res.status(404).json({ error: `Room with code "${normalizedCode}" not found.` });
    }

    const allUsers = dbInstance.getUsersInRoom(room.id);
    const approvedCount = allUsers.filter(u => u.status === 'APPROVED').length;

    if (approvedCount >= room.maxMembers) {
      return res.status(400).json({ error: 'This room is currently at maximum capacity.' });
    }

    // Check if username is taken in this room
    const nameConflict = allUsers.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.status !== 'REJECTED'
    );
    if (nameConflict) {
      // If they are pending, let them rejoin existing session
      if (nameConflict.status === 'PENDING') {
        return res.json({
          success: true,
          room,
          user: nameConflict,
          message: 'Reconnected to your pending request.'
        });
      }
      // If they are approved, let them reuse session (so refreshing works seamlessly!)
      if (nameConflict.status === 'APPROVED') {
        return res.json({
          success: true,
          room,
          user: nameConflict,
          message: 'Session resumed.'
        });
      }
    }

    // Create new pending user
    const user = dbInstance.createUser(username.trim(), room.id, 'MEMBER', 'PENDING');

    return res.json({
      success: true,
      room,
      user
    });
  });

  // Create standard HTTP server and attach SocketJS
  const server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Delete Room Endpoint (Room admin can delete/close the room from the outside/landing view)
  app.post('/api/rooms/delete', (req, res) => {
    const { username, roomCode } = req.body;
    if (!username || !username.trim() || !roomCode || !roomCode.trim()) {
      return res.status(400).json({ error: 'Username and room code are required.' });
    }

    const normCode = roomCode.trim().toUpperCase();
    const room = dbInstance.getRoom(normCode);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const allUsers = dbInstance.getUsersInRoom(room.id);
    const admin = allUsers.find(u => u.role === 'ADMIN' && u.username.toLowerCase() === username.trim().toLowerCase());

    if (!admin) {
      return res.status(403).json({ error: 'Only the room creator admin can delete this room.' });
    }

    // Emit closed event to all active sockets in the room
    io.to(room.id).emit('room:closed');

    // Wipe room from database completely
    dbInstance.deleteRoom(room.id);

    return res.json({ success: true, message: `Room ${normCode} has been deleted successfully.` });
  });

  // Helper with specific user updates for multi-user security
  function broadcastRoomState(roomId: string) {
    const room = dbInstance.getRoomById(roomId);
    if (!room) return;

    const users = dbInstance.getUsersInRoom(roomId);
    const messages = dbInstance.getRoomMessages(roomId);

    const members = users.filter(u => u.status === 'APPROVED');
    const pendingRequests = users.filter(u => u.status === 'PENDING');

    users.forEach(user => {
      if (!user.socketId) return;

      if (user.role === 'ADMIN') {
        io.to(user.socketId).emit('room:state', {
          room,
          currentUser: user,
          members,
          pendingRequests,
          messages
        });
      } else if (user.status === 'APPROVED') {
        io.to(user.socketId).emit('room:state', {
          room,
          currentUser: user,
          members,
          pendingRequests: [],
          messages
        });
      } else {
        io.to(user.socketId).emit('room:state', {
          room,
          currentUser: user,
          members: [],
          pendingRequests: [],
          messages: []
        });
      }
    });
  }

  function insertSystemMessage(roomId: string, content: string) {
    dbInstance.createMessage(content, 'SYSTEM', 'System', roomId);
    broadcastRoomState(roomId);
  }

  // Socket connection handler
  io.on('connection', (socket) => {
    // Handshake binds user to their socket
    socket.on('room:handshake', ({ userId, roomId }) => {
      const user = dbInstance.getUser(userId);
      const room = dbInstance.getRoomById(roomId);

      if (user && room && user.roomId === roomId) {
        const wasOffline = !user.socketId;
        dbInstance.updateUserSocket(userId, socket.id);
        socket.join(roomId);

        // System notification for rejoining / coming online
        if (user.status === 'APPROVED') {
          if (wasOffline) {
            insertSystemMessage(roomId, `${user.username} reconnected.`);
          } else {
            // First time connecting after approval or refresh
            insertSystemMessage(roomId, `${user.username} entered the chat.`);
          }
        } else if (user.status === 'PENDING') {
          // Tell the admin a new request is waiting or online
          const admin = dbInstance.getUsersInRoom(roomId).find(u => u.role === 'ADMIN');
          if (admin && admin.socketId) {
            io.to(admin.socketId).emit('room:join-alert', { username: user.username });
          }
        }
        broadcastRoomState(roomId);
      } else {
        socket.emit('room:error', 'Invalid room association.');
      }
    });

    // Chat message sending
    socket.on('chat:message', ({ userId, roomId, content }) => {
      const user = dbInstance.getUser(userId);
      if (!user || user.roomId !== roomId || user.status !== 'APPROVED') {
        return socket.emit('room:error', 'Unauthorized to message in this room.');
      }

      if (!content || !content.trim()) return;

      // Basic rate limiting & protection: sanitize html tags
      const sanitized = content.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      dbInstance.createMessage(sanitized, userId, user.username, roomId);
      broadcastRoomState(roomId);
    });

    // Admin action: Approve requester
    socket.on('room:approve', ({ adminId, roomId, userId }) => {
      const admin = dbInstance.getUser(adminId);
      if (!admin || admin.roomId !== roomId || admin.role !== 'ADMIN') {
        return socket.emit('room:error', 'Only admins can approve members.');
      }

      const room = dbInstance.getRoomById(roomId);
      if (!room) return;

      const approvedCount = dbInstance.getUsersInRoom(roomId).filter(u => u.status === 'APPROVED').length;
      if (approvedCount >= room.maxMembers) {
        return socket.emit('room:error', `Cannot approve. Room capacity of ${room.maxMembers} reached.`);
      }

      const approvedUser = dbInstance.updateUserStatus(userId, 'APPROVED');
      if (approvedUser) {
        // Send approval message to user's socket directly (this triggers their UI upgrade)
        if (approvedUser.socketId) {
          io.to(approvedUser.socketId).emit('room:approved');
        }
        insertSystemMessage(roomId, `${approvedUser.username} has been approved and joined.`);
      }
    });

    // Admin action: Reject requester
    socket.on('room:reject', ({ adminId, roomId, userId }) => {
      const admin = dbInstance.getUser(adminId);
      if (!admin || admin.roomId !== roomId || admin.role !== 'ADMIN') {
        return socket.emit('room:error', 'Only admins can reject members.');
      }

      const rejectedUser = dbInstance.getUser(userId);
      if (rejectedUser) {
        dbInstance.updateUserStatus(userId, 'REJECTED');
        if (rejectedUser.socketId) {
          io.to(rejectedUser.socketId).emit('room:rejected', 'Join request was rejected.');
        }
        dbInstance.removeUser(userId);
        broadcastRoomState(roomId);
      }
    });

    // Admin action: Kick/Remove approved member
    socket.on('room:remove-user', ({ adminId, roomId, userId }) => {
      const admin = dbInstance.getUser(adminId);
      if (!admin || admin.roomId !== roomId || admin.role !== 'ADMIN') {
        return socket.emit('room:error', 'Only admins can remove members.');
      }

      const targetUser = dbInstance.getUser(userId);
      if (targetUser && targetUser.role !== 'ADMIN') {
        if (targetUser.socketId) {
          io.to(targetUser.socketId).emit('room:removed', 'You were removed by the admin.');
        }
        dbInstance.removeUser(userId);
        insertSystemMessage(roomId, `${targetUser.username} was removed by admin.`);
      }
    });

    // Admin action: Change member limit
    socket.on('room:update-limit', ({ adminId, roomId, newLimit }) => {
      const admin = dbInstance.getUser(adminId);
      if (!admin || admin.roomId !== roomId || admin.role !== 'ADMIN') {
        return socket.emit('room:error', 'Only admins can change settings.');
      }

      const limit = parseInt(newLimit, 10);
      if (isNaN(limit) || limit < 2 || limit > 50) {
        return socket.emit('room:error', 'Limit must be between 2 and 50.');
      }

      dbInstance.updateRoomLimit(roomId, limit);
      insertSystemMessage(roomId, `Room member limit updated to ${limit}.`);
    });

    // Admin action: Close room
    socket.on('room:close', ({ adminId, roomId }) => {
      const admin = dbInstance.getUser(adminId);
      if (!admin || admin.roomId !== roomId || admin.role !== 'ADMIN') {
        return socket.emit('room:error', 'Only admins can close the room.');
      }

      // Notify everyone in the room
      io.to(roomId).emit('room:closed');

      // Wipe room from DB
      dbInstance.deleteRoom(roomId);
    });

    // Manual Leave room
    socket.on('room:leave', ({ userId, roomId }) => {
      const user = dbInstance.getUser(userId);
      if (user && user.roomId === roomId) {
        if (user.role === 'ADMIN') {
          // Do not delete the ADMIN so they can delete the room or rejoin later
          dbInstance.updateUserSocket(userId, undefined);
        } else {
          dbInstance.removeUser(userId);
        }
        socket.leave(roomId);
        insertSystemMessage(roomId, `${user.username} left the room.`);
      }
    });

    // Offline state handling
    socket.on('disconnect', () => {
      const user = dbInstance.getUserBySocket(socket.id);
      if (user) {
        dbInstance.updateUserSocket(user.id, undefined);
        
        if (user.status === 'APPROVED') {
          // Keep active members as offline for reconnection
          insertSystemMessage(user.roomId, `${user.username} went offline.`);
        } else {
          // Keep pending members in database during transient toggles; notify room of status state
          broadcastRoomState(user.roomId);
        }
      }
    });
  });

  // --- Vite Dev & Production Integration ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
