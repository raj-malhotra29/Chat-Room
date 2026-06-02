import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Send, UserMinus, ShieldAlert, LogOut, Check, X, Copy, 
  Settings, MessageSquare, Menu, Menu as MenuIcon, ChevronRight, Sparkles, Plus, AlertTriangle
} from 'lucide-react';
import { Room, User, Message } from '../types';

interface ChatLayoutProps {
  room: Room;
  currentUser: User;
  members: User[];
  pendingRequests: User[];
  messages: Message[];
  onSendMessage: (content: string) => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onKickUser: (userId: string) => void;
  onUpdateLimit: (newLimit: number) => void;
  onCloseRoom: () => void;
  onLeaveRoom: () => void;
}

export default function ChatLayout({
  room,
  currentUser,
  members,
  pendingRequests,
  messages,
  onSendMessage,
  onApproveUser,
  onRejectUser,
  onKickUser,
  onUpdateLimit,
  onCloseRoom,
  onLeaveRoom
}: ChatLayoutProps) {
  const [typedMessage, setTypedMessage] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newLimitVal, setNewLimitVal] = useState(room.maxMembers);
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'settings'>('members');

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sync state edit limit
  useEffect(() => {
    setNewLimitVal(room.maxMembers);
  }, [room.maxMembers]);

  // Handle auto-scroll to bottom of messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Handle message submission
  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || typedMessage.length > 500) return;
    onSendMessage(typedMessage.trim());
    setTypedMessage('');
  };

  // Copy Room Code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy invitation link
  const copyInvitationLink = () => {
    const inviteUrl = `${window.location.origin}?code=${room.roomCode}`;
    navigator.clipboard.writeText(`Join my private chat room on RoomChat! Code: ${room.roomCode}\nLink: ${inviteUrl}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Helper to format timestamp
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Generate a soft avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-indigo-600 text-indigo-100',
      'bg-teal-600 text-teal-100',
      'bg-amber-600 text-amber-100',
      'bg-rose-600 text-rose-100',
      'bg-blue-600 text-blue-100',
      'bg-purple-600 text-purple-100',
      'bg-emerald-600 text-emerald-100',
      'bg-cyan-600 text-cyan-100'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
        sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div id="chat-layout" className="w-full h-[90vh] md:h-[84vh] grid grid-cols-1 lg:grid-cols-4 border border-slate-800 bg-slate-900/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 bg-black z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel of Members / Approvals / Controls */}
      <div id="sidebar-container" className={`
        absolute inset-y-0 left-0 w-72 lg:w-auto bg-slate-950 z-40 transform lg:static lg:transform-none lg:flex lg:flex-col lg:border-r border-slate-800 transition-transform duration-300
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white text-sm">Room Navigator</h3>
              <p className="text-[10px] text-slate-500 font-mono">CODE: {room.roomCode}</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Sidebar Tabs (For admin settings, members, requests) */}
        {isAdmin && (
          <div className="flex border-b border-slate-800 text-xs text-slate-400 bg-slate-950/40 p-1 gap-1">
            <button
              id="tab-members"
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all cursor-pointer ${
                activeTab === 'members' ? 'bg-slate-800 text-white' : 'hover:text-slate-200'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              id="tab-pending"
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all relative cursor-pointer ${
                activeTab === 'pending' ? 'bg-slate-800 text-white' : 'hover:text-slate-200'
              }`}
            >
              Join Q
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 text-[9px] font-mono px-1 rounded-full bg-indigo-500 border border-indigo-400 text-white flex items-center justify-center font-bold animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              id="tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all cursor-pointer ${
                activeTab === 'settings' ? 'bg-slate-800 text-white' : 'hover:text-slate-200'
              }`}
            >
              Controls
            </button>
          </div>
        )}

        {/* Sidebar Scroller */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
          
          {/* Active Tab: MEMBERS LIST */}
          {(activeTab === 'members' || !isAdmin) && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                <span>Room Occupants</span>
                <span>{members.length}/{room.maxMembers}</span>
              </div>
              
              <div id="sidebar-members-list" className="space-y-2">
                {members.map((m) => {
                  const isUserOnline = !!m.socketId;
                  const isCurrent = m.id === currentUser.id;
                  
                  return (
                    <div
                      key={m.id}
                      className="group flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-900 hover:bg-slate-900/80 transition-all duration-150"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-semibold uppercase text-xs shrink-0 ${getAvatarColor(m.username)}`}>
                            {m.username.charAt(0)}
                          </div>
                          {/* Live Presence Dot: green if online, slate if offline */}
                          <span 
                            title={isUserOnline ? 'Online' : 'Offline'}
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 shadow-sm transition-all duration-300 ${
                              isUserOnline ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-600'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-medium text-slate-200 block truncate leading-tight">
                            {m.username} {isCurrent && <span className="text-[10px] text-indigo-400 font-normal opacity-90">(You)</span>}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider leading-none">
                            {m.role}
                          </span>
                        </div>
                      </div>

                      {/* Admin Kick Power */}
                      {isAdmin && m.role !== 'ADMIN' && (
                        <button
                          id={`kick-user-${m.id}`}
                          onClick={() => onKickUser(m.id)}
                          title="Remove user from room"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-900/30 transition-all cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Tab: PENDING REQUESTS PANEL (ONLY FOR ADMIN) */}
          {activeTab === 'pending' && isAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                <span>Pending Approvals</span>
                <span className="bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded font-bold">{pendingRequests.length} Waiting</span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-500">No active join requests.</p>
                  <p className="text-[10px] text-slate-600">Give users the Room Code to invite them to register a pending query.</p>
                </div>
              ) : (
                <div id="pending-requests-list" className="space-y-2.5">
                  <AnimatePresence>
                    {pendingRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-3 rounded-lg bg-slate-900 border border-indigo-950/40 border-l-2 border-l-indigo-500 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white block truncate">
                            {req.username}
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 bg-slate-950/60 px-1 py-0.5 rounded uppercase">
                            PENDING
                          </span>
                        </div>

                        <div className="flex gap-1.5 pt-1">
                          <button
                            id={`approve-user-${req.id}`}
                            onClick={() => onApproveUser(req.id)}
                            className="flex-1 py-1 text-[10px] font-semibold bg-emerald-950 border border-emerald-900 text-emerald-400 hover:bg-emerald-900 hover:text-white rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            id={`reject-user-${req.id}`}
                            onClick={() => onRejectUser(req.id)}
                            className="py-1 px-2 text-[10px] bg-red-950 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white rounded-md transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Active Tab: ADMIN CONTROLS (ONLY FOR ADMIN) */}
          {activeTab === 'settings' && isAdmin && (
            <div className="space-y-4">
              <div className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                <span>Room Configuration</span>
              </div>

              {/* Adjust Capacity */}
              <div className="space-y-2 bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Room Capacity</label>
                  <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/30 border border-indigo-900/20 px-1.5 rounded">
                    {newLimitVal} Max
                  </span>
                </div>
                <input
                  id="admin-capacity-slider"
                  type="range"
                  min="2"
                  max="50"
                  value={newLimitVal}
                  onChange={(e) => setNewLimitVal(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  id="btn-update-capacity"
                  onClick={() => onUpdateLimit(newLimitVal)}
                  disabled={newLimitVal === room.maxMembers}
                  className="w-full mt-1.5 py-1 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-500 rounded-md transition-colors cursor-pointer"
                >
                  Apply Capacity Count
                </button>
              </div>

              {/* Invitation Helper Box */}
              <div className="p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-indigo-300 block">Invitation Broadcast</span>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Copy invitation links to send directly to friends. New users automatically register under room "{room.roomCode}".
                </p>
                <div className="flex gap-1.5">
                  <button
                    id="btn-invite-copy-link"
                    onClick={copyInvitationLink}
                    className="flex-1 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> {copiedLink ? 'Copied' : 'Invite Link'}
                  </button>
                </div>
              </div>

              {/* Close Room Danger Zone */}
              <div className="pt-2">
                <button
                  id="btn-close-room"
                  onClick={() => {
                    if (confirm('Are you absolutely sure you want to close this room? This will kick out all occupants and erase all messages permanently.')) {
                      onCloseRoom();
                    }
                  }}
                  className="w-full py-2 text-xs font-medium text-red-400 hover:text-white bg-red-950/20 hover:bg-red-600 border border-red-900/40 hover:border-red-500 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Close Room Session
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 text-xs flex justify-between items-center text-slate-500">
          <div className="min-w-0">
            <span className="block truncate font-medium text-slate-400">{currentUser.username}</span>
            <span className="text-[10px] font-mono leading-none">{isAdmin ? 'Room Creator' : 'Regular Guest'}</span>
          </div>
          <button
            id="leave-chat-btn"
            onClick={onLeaveRoom}
            title={isAdmin ? "Exit Room (Keeps Alive)" : "Leave Room Panel"}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chat Interface section */}
      <div id="main-chat-section" className="lg:col-span-3 flex flex-col h-full bg-slate-950 bg-gradient-to-b from-slate-950 to-slate-900/90 relative">
        
        {/* Chat Control Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Hamburger for Mobile Drawers */}
            <button
              id="sidebar-toggle-mobile"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <MenuIcon className="w-4 h-4" />
            </button>

            {/* Room Identifier badges */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-white text-base">RoomChat</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-emerald-950/50 border border-emerald-900 text-emerald-400 rounded">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse-slow" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                Room Code:{' '}
                <button 
                  id="roomcode-copy-text"
                  onClick={copyRoomCode} 
                  className="font-mono text-white underline hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                  title="Click to copy Room Code"
                >
                  <strong>{room.roomCode}</strong>
                  <Copy className="w-2.5 h-2.5 inline shrink-0" />
                  {copiedCode && <span className="text-[8px] text-emerald-400 font-bold bg-emerald-950/40 px-1 py-0.2 heading-none rounded">Copied</span>}
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick occupants badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-200">{members.length}</span>
              <span className="text-slate-600 font-mono text-[10px]">/ {room.maxMembers}</span>
            </div>

            {/* Close room quick or leave room badge */}
            {isAdmin ? (
              <button
                id="header-btn-close-room"
                onClick={() => {
                  if (confirm('Verify: Close room session entirely?')) {
                    onCloseRoom();
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-950/20 hover:bg-rose-600 rounded-md border border-rose-900/30 hover:border-rose-500 transition-all cursor-pointer"
              >
                Close Room
              </button>
            ) : (
              <button
                id="header-btn-leave-room"
                onClick={onLeaveRoom}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-md border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>

        {/* Message Panels Scroll Areas */}
        <div 
          id="messages-viewport"
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-3.5 max-w-sm mx-auto">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Quiet beginnings...</p>
                <p className="text-xs text-slate-500">There are no messages in this private room session yet. Say hello to get started!</p>
              </div>

              {/* Prebuilt template hooks for fast fun */}
              <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                {['👋 Hey everyone!', '🚀 Welcome to RoomChat', '⚡ Highly private & secure', '🔒 Pure safety'].map(txt => (
                  <button
                    key={txt}
                    onClick={() => onSendMessage(txt)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-full border border-slate-850 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isSystem = msg.senderId === 'SYSTEM';
              const isMe = msg.senderId === currentUser.id;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[10px] font-medium font-mono text-slate-500 bg-slate-900/60 border border-slate-900/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2.5`}
                >
                  {/* Left avatar if not me */}
                  {!isMe && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold uppercase shrink-0 text-xs shadow-sm ${getAvatarColor(msg.senderName)}`}>
                      {msg.senderName.charAt(0)}
                    </div>
                  )}

                  {/* Bubble wrapper */}
                  <div className={`max-w-[70%] space-y-1`}>
                    {/* Sender Name header */}
                    {!isMe && (
                      <span className="text-[10px] font-semibold text-slate-400 pl-1">
                        {msg.senderName}
                      </span>
                    )}

                    <div className={`
                      p-3 rounded-2xl text-xs break-words leading-relaxed relative shadow-md
                      ${isMe 
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                      }
                    `}>
                      <p>{msg.content}</p>
                    </div>

                    {/* Timestamp footer */}
                    <div className={`text-[9px] text-slate-500 font-mono px-1 flex ${isMe ? 'justify-end' : 'justify-start'} gap-1`}>
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Inputs Box */}
        <div id="chat-input-controls" className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <form onSubmit={handleSubmitMessage} className="flex items-center gap-2">
            
            {/* Compact Popular Emoji Quick Panel */}
            <div className="hidden sm:flex gap-1 pr-1 border-r border-slate-800">
              {['👍', '🔥', '😂', '👋', '🎉'].map(emoji => (
                <button
                  id={`emoji-${emoji}`}
                  key={emoji}
                  type="button"
                  onClick={() => onSendMessage(emoji)}
                  className="w-7 h-7 rounded hover:bg-slate-900 text-sm flex items-center justify-center transition-all cursor-pointer hover:scale-115 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <input
              id="chat-message-input"
              type="text"
              required
              maxLength={500}
              placeholder="Type your message here..."
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              className="flex-1 text-xs rounded-xl bg-slate-950 border border-slate-800/80 text-white px-3.5 py-2.5 outline-none focus:border-indigo-500 hover:border-slate-700 transition-colors max-w-full"
            />

            <button
              id="chat-send-btn"
              type="submit"
              disabled={!typedMessage.trim() || typedMessage.length > 500}
              className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all hover:shadow-lg hover:shadow-indigo-950/50 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          
          <div className="flex justify-between items-center text-[9px] text-slate-600 mt-1.5 px-0.5 font-mono">
            <span>RoomChat v1.0 • Live WebSockets</span>
            <span>{typedMessage.length} / 500 chars</span>
          </div>
        </div>

      </div>

    </div>
  );
}
