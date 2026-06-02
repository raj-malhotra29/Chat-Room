import fs from 'fs';
import path from 'path';
import { Room, User, Message, UserRole, UserStatus } from './src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  rooms: Room[];
  users: User[];
  messages: Message[];
}

class DatabaseManager {
  private data: Schema = { rooms: [], users: [], messages: [] };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Correct dates back or handle as strings
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to load database, starting fresh:', e);
      this.data = { rooms: [], users: [], messages: [] };
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save to database file:', e);
    }
  }

  // --- Rooms ---
  getRoom(roomCode: string): Room | undefined {
    this.load();
    return this.data.rooms.find(r => r.roomCode.toUpperCase() === roomCode.toUpperCase());
  }

  getRoomById(roomId: string): Room | undefined {
    this.load();
    return this.data.rooms.find(r => r.id === roomId);
  }

  createRoom(roomCode: string, maxMembers: number): Room {
    this.load();
    const existing = this.getRoom(roomCode);
    if (existing) {
      return existing;
    }

    const newRoom: Room = {
      id: Math.random().toString(36).substring(2, 11),
      roomCode: roomCode.toUpperCase(),
      maxMembers,
      createdAt: new Date().toISOString()
    };

    this.data.rooms.push(newRoom);
    this.save();
    return newRoom;
  }

  updateRoomLimit(roomId: string, newLimit: number): void {
    this.load();
    const room = this.data.rooms.find(r => r.id === roomId);
    if (room) {
      room.maxMembers = newLimit;
      this.save();
    }
  }

  deleteRoom(roomId: string): void {
    this.load();
    this.data.rooms = this.data.rooms.filter(r => r.id !== roomId);
    this.data.users = this.data.users.filter(u => u.roomId !== roomId);
    this.data.messages = this.data.messages.filter(m => m.roomId !== roomId);
    this.save();
  }

  // --- Users ---
  getUser(userId: string): User | undefined {
    this.load();
    return this.data.users.find(u => u.id === userId);
  }

  getUserBySocket(socketId: string): User | undefined {
    this.load();
    return this.data.users.find(u => u.socketId === socketId);
  }

  getUsersInRoom(roomId: string): User[] {
    this.load();
    return this.data.users.filter(u => u.roomId === roomId);
  }

  createUser(username: string, roomId: string, role: UserRole, status: UserStatus, socketId?: string): User {
    this.load();
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      username,
      roomId,
      role,
      status,
      socketId
    };

    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUserStatus(userId: string, status: UserStatus): User | undefined {
    this.load();
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.status = status;
      this.save();
    }
    return user;
  }

  updateUserSocket(userId: string, socketId: string | undefined): void {
    this.load();
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.socketId = socketId;
      this.save();
    }
  }

  removeUser(userId: string): void {
    this.load();
    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.save();
  }

  // --- Messages ---
  getRoomMessages(roomId: string): Message[] {
    this.load();
    return this.data.messages.filter(m => m.roomId === roomId);
  }

  createMessage(content: string, senderId: string, senderName: string, roomId: string): Message {
    this.load();
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      content,
      senderId,
      senderName,
      roomId,
      createdAt: new Date().toISOString()
    };

    this.data.messages.push(newMessage);
    this.save();
    return newMessage;
  }
}

export const dbInstance = new DatabaseManager();
