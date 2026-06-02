import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, MessageSquare, AlertCircle, Info, RefreshCw, Smartphone, Laptop, Sparkles } from 'lucide-react';
import { Room, User, Message } from './types';
import { getSocket, disconnectSocket } from './lib/socket';
import LandingCard from './components/LandingCard';
import QueueRoom from './components/QueueRoom';
import ChatLayout from './components/ChatLayout';

export default function App() {
  // Navigation / Active Session States
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'LANDING' | 'QUEUE' | 'CHAT'>('LANDING');

  // Popup / Feedback Modals
  const [modalMessage, setModalMessage] = useState<{
    title: string;
    description: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  // Connection alert banner
  const [connected, setConnected] = useState(false);

  // Read Session Storage to resume chat on page refreshes
  useEffect(() => {
    try {
      const savedRoom = sessionStorage.getItem('roomchat_room');
      const savedUser = sessionStorage.getItem('roomchat_user');
      
      if (savedRoom && savedUser) {
        const parsedRoom = JSON.parse(savedRoom) as Room;
        const parsedUser = JSON.parse(savedUser) as User;
        
        setActiveRoom(parsedRoom);
        setCurrentUser(parsedUser);
        
        if (parsedUser.status === 'APPROVED') {
          setSessionStatus('CHAT');
        } else if (parsedUser.status === 'PENDING') {
          setSessionStatus('QUEUE');
        }
      }
    } catch (e) {
      console.error('Session storage recovery failed', e);
    }
  }, []);

  // Handle Socket.IO connection side-effects
  useEffect(() => {
    if (sessionStatus === 'LANDING' || !currentUser || !activeRoom) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    const socket = getSocket();
    
    const handleConnect = () => {
      setConnected(true);
      // Perform handshake binding session with current socket id
      socket.emit('room:handshake', {
        userId: currentUser.id,
        roomId: activeRoom.id
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // If socket is already connected, trigger the handshake handler immediately.
    // Otherwise, establish connection.
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    // Listen to real-time status and lists payload
    socket.on('room:state', (state: {
      room: Room;
      currentUser: User;
      members: User[];
      pendingRequests: User[];
      messages: Message[];
    }) => {
      setActiveRoom(state.room);
      setCurrentUser(state.currentUser);
      setMembers(state.members);
      setPendingRequests(state.pendingRequests);
      setMessages(state.messages);

      // Save latest details to session
      sessionStorage.setItem('roomchat_room', JSON.stringify(state.room));
      sessionStorage.setItem('roomchat_user', JSON.stringify(state.currentUser));

      // Coordinate layout redirects based on server profile status
      if (state.currentUser.status === 'APPROVED') {
        setSessionStatus('CHAT');
      } else if (state.currentUser.status === 'PENDING') {
        setSessionStatus('QUEUE');
      }
    });

    // Specific alert events
    socket.on('room:approved', () => {
      setSessionStatus('CHAT');
      setModalMessage({
        title: 'Access Granted!',
        description: 'The room creator approved your request. Welcome aboard!',
        type: 'success'
      });
    });

    socket.on('room:rejected', (reason) => {
      cleanAndExit();
      setModalMessage({
        title: 'Join Request Declined',
        description: reason || 'An administrator declined your admission request.',
        type: 'error'
      });
    });

    socket.on('room:removed', (reason) => {
      cleanAndExit();
      setModalMessage({
        title: 'Session Terminated',
        description: reason || 'You were disconnected from the room by the admin.',
        type: 'info'
      });
    });

    socket.on('room:closed', () => {
      cleanAndExit();
      setModalMessage({
        title: 'Room Closed',
        description: 'The administrator has securely closed this session room.',
        type: 'info'
      });
    });

    socket.on('room:join-alert', ({ username }) => {
      setModalMessage({
        title: 'New Access Request!',
        description: `User "${username}" is waiting to join. View and approve them in the "Join Q" tab.`,
        type: 'info'
      });
    });

    socket.on('room:error', (errorMsg) => {
      setModalMessage({
        title: 'Room Error Alert',
        description: errorMsg,
        type: 'error'
      });
    });

    // Clean up connections and events
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:state');
      socket.off('room:approved');
      socket.off('room:rejected');
      socket.off('room:removed');
      socket.off('room:closed');
      socket.off('room:join-alert');
      socket.off('room:error');
    };
  }, [sessionStatus, currentUser?.id]);

  // Handle URL code parameters prefilling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam && sessionStatus === 'LANDING') {
      // Find the landing wrapper elements to join automatically
      setTimeout(() => {
        const joinBtn = document.getElementById('select-join-room');
        if (joinBtn) {
          joinBtn.click();
          setTimeout(() => {
            const codeInput = document.getElementById('join-roomcode') as HTMLInputElement;
            if (codeInput) {
              codeInput.value = codeParam.toUpperCase();
              // Trigger input event to trigger validation
              const event = new Event('input', { bubbles: true });
              codeInput.dispatchEvent(event);
            }
          }, 300);
        }
      }, 500);
    }
  }, []);

  const cleanAndExit = () => {
    disconnectSocket();
    sessionStorage.removeItem('roomchat_room');
    sessionStorage.removeItem('roomchat_user');
    setActiveRoom(null);
    setCurrentUser(null);
    setMembers([]);
    setPendingRequests([]);
    setMessages([]);
    setSessionStatus('LANDING');
  };

  // User Actions Proxied through WebSockets
  const handleSendMessage = (content: string) => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('chat:message', {
      userId: currentUser.id,
      roomId: activeRoom.id,
      content
    });
  };

  const handleApproveUser = (userId: string) => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('room:approve', {
      adminId: currentUser.id,
      roomId: activeRoom.id,
      userId
    });
  };

  const handleRejectUser = (userId: string) => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('room:reject', {
      adminId: currentUser.id,
      roomId: activeRoom.id,
      userId
    });
  };

  const handleKickUser = (userId: string) => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('room:remove-user', {
      adminId: currentUser.id,
      roomId: activeRoom.id,
      userId
    });
  };

  const handleUpdateLimit = (newLimit: number) => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('room:update-limit', {
      adminId: currentUser.id,
      roomId: activeRoom.id,
      newLimit
    });
  };

  const handleCloseRoom = () => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('room:close', {
      adminId: currentUser.id,
      roomId: activeRoom.id
    });
  };

  const handleLeaveRoom = () => {
    if (!currentUser || !activeRoom) return;
    const socket = getSocket();
    socket.emit('room:leave', {
      userId: currentUser.id,
      roomId: activeRoom.id
    });
    cleanAndExit();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      
      {/* Background Static Stars Canvas Subtle Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950 pointer-events-none z-0" />

      {/* Main Top Header Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 md:py-6 flex items-center justify-between border-b border-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-950/45 p-0.5">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="font-display font-extrabold text-lg text-white leading-tight block">
              RoomChat
            </span>
            <span className="text-[9px] text-slate-500 font-mono block tracking-wider uppercase">
              No registration ephemeral chat
            </span>
          </div>
        </div>

        {/* Real-time Connection status indicator */}
        <div className="flex items-center gap-3">
          {sessionStatus !== 'LANDING' && (
            <div className="flex items-center gap-1.5 bg-slate-900/85 border border-slate-800 rounded-full px-2.5 py-1 text-[10px] font-mono leading-none">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-400 capitalize">{connected ? 'synced' : 'reconnecting'}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ShieldCheck className="w-4 h-4 text-indigo-400 pr-0.5" />
            <span className="font-medium hidden sm:inline">100% Encrypted Node</span>
          </div>
        </div>
      </header>

      {/* Main Form/Room Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          {sessionStatus === 'LANDING' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full"
            >
              <LandingCard
                onRoomCreated={(room, user) => {
                  setActiveRoom(room);
                  setCurrentUser(user);
                  setSessionStatus('CHAT'); // Creator becomes approved administrator immediately
                  sessionStorage.setItem('roomchat_room', JSON.stringify(room));
                  sessionStorage.setItem('roomchat_user', JSON.stringify(user));
                }}
                onRoomJoined={(room, user) => {
                  setActiveRoom(room);
                  setCurrentUser(user);
                  setSessionStatus(user.status === 'APPROVED' ? 'CHAT' : 'QUEUE');
                  sessionStorage.setItem('roomchat_room', JSON.stringify(room));
                  sessionStorage.setItem('roomchat_user', JSON.stringify(user));
                }}
              />
            </motion.div>
          ) : sessionStatus === 'QUEUE' && activeRoom && currentUser ? (
            <motion.div
              key="queue"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full"
            >
              <QueueRoom
                room={activeRoom}
                user={currentUser}
                onCancel={handleLeaveRoom}
              />
            </motion.div>
          ) : sessionStatus === 'CHAT' && activeRoom && currentUser ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="w-full max-w-7xl mx-auto"
            >
              <ChatLayout
                room={activeRoom}
                currentUser={currentUser}
                members={members}
                pendingRequests={pendingRequests}
                messages={messages}
                onSendMessage={handleSendMessage}
                onApproveUser={handleApproveUser}
                onRejectUser={handleRejectUser}
                onKickUser={handleKickUser}
                onUpdateLimit={handleUpdateLimit}
                onCloseRoom={handleCloseRoom}
                onLeaveRoom={handleLeaveRoom}
              />
            </motion.div>
          ) : (
            <div key="fallback" className="text-center py-10 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
              <p className="text-sm text-slate-400">Loading active room details...</p>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-slate-900/40 text-[10px] text-slate-600 font-mono shrink-0">
        <p>© 2026 RoomChat • Decentralized ephemeral chat rooms without telemetry.</p>
      </footer>

      {/* Fully custom alert Dialog modal */}
      <AnimatePresence>
        {modalMessage && (
          <div id="custom-modal-alert" className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  modalMessage.type === 'error' 
                    ? 'bg-rose-950/30 border-rose-900/50 text-rose-400' 
                    : modalMessage.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                    : 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white font-display">
                    {modalMessage.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-normal">
                    {modalMessage.description}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="btn-close-modal"
                  onClick={() => setModalMessage(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-800"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
