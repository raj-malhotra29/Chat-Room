import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, DoorOpen, Sparkles, RefreshCw, AlertCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { Room, User } from '../types';

interface LandingCardProps {
  onRoomCreated: (room: Room, user: User) => void;
  onRoomJoined: (room: Room, user: User) => void;
}

export default function LandingCard({ onRoomCreated, onRoomJoined }: LandingCardProps) {
  const [view, setView] = useState<'options' | 'create' | 'join'>('options');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxMembers, setMaxMembers] = useState(10);
  
  // Validation / async check states
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<{
    exists: boolean;
    currentMembers: number;
    maxMembers: number;
    isFull: boolean;
    adminName: string | null;
  } | null>(null);

  const isCurrentUserAdmin = !!(
    roomInfo &&
    roomInfo.adminName &&
    username.trim().toLowerCase() === roomInfo.adminName.toLowerCase()
  );

  const handleDeleteRoom = async () => {
    if (!username.trim() || !roomCode.trim()) return;
    if (!confirm(`Are you absolutely sure you want to shut down this room? This will instantly evict all current members and erase all messages permanently.`)) {
      return;
    }

    setDeleting(true);
    setErrorCode('');

    try {
      const res = await fetch('/api/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.slice(0, 15),
          roomCode: roomCode.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setView('options');
        setRoomCode('');
        setRoomInfo(null);
        setErrorCode('');
        alert(`Room "${roomCode}" was deleted successfully.`);
      } else {
        setErrorCode(data.error || 'Failed to delete room.');
      }
    } catch (err) {
      setErrorCode('Network error, please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Generate a random room code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode('RM-' + code);
    setErrorCode('');
  };

  // Live checks for Join room code
  useEffect(() => {
    if (view !== 'join' || roomCode.trim().length < 3) {
      setRoomInfo(null);
      setErrorCode('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/rooms/check/${roomCode.trim()}`);
        if (res.ok) {
          const data = await res.json();
          setRoomInfo(data);
          setErrorCode('');
        } else {
          setRoomInfo(null);
          setErrorCode('Room not found or inactive.');
        }
      } catch (err) {
        console.error('Check failed', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [roomCode, view]);

  // Handle room creation HTTP POST
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorCode('Please enter a username.');
      return;
    }
    
    setLoading(true);
    setErrorCode('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.slice(0, 15),
          roomCode: roomCode || undefined,
          maxMembers
        })
      });

      const data = await res.json();
      if (res.ok) {
        onRoomCreated(data.room, data.user);
      } else {
        setErrorCode(data.error || 'Failed to create room.');
      }
    } catch (err) {
      setErrorCode('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle room joining HTTP POST
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorCode('Please enter a username.');
      return;
    }
    if (!roomCode.trim()) {
      setErrorCode('Please enter a room code.');
      return;
    }

    setLoading(true);
    setErrorCode('');

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.slice(0, 15),
          roomCode: roomCode.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        onRoomJoined(data.room, data.user);
      } else {
        setErrorCode(data.error || 'Failed to request joining.');
      }
    } catch (err) {
      setErrorCode('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="landing-card-wrapper" className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {view === 'options' && (
          <motion.div
            key="options"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            id="options-panel"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient subtle glow ring */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 animate-pulse-slow" />
              </div>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-white">
                RoomChat
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Private, serverless-vibe chat rooms with real-time admin approvals.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                id="select-create-room"
                onClick={() => {
                  setView('create');
                  setErrorCode('');
                  // Instantly generate a code for ease
                  generateCode();
                }}
                className="group relative flex items-center justify-between text-left p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-blue-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:scale-105 transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-white block text-sm">Create New Room</span>
                    <span className="text-xs text-slate-400">Generate a code and act as the room admin</span>
                  </div>
                </div>
                <Users className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                id="select-join-room"
                onClick={() => {
                  setView('join');
                  setErrorCode('');
                  setRoomCode('');
                }}
                className="group relative flex items-center justify-between text-left p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-white block text-sm">Join Existing Room</span>
                    <span className="text-xs text-slate-400">Enter a code and join. Awaits creator approval</span>
                  </div>
                </div>
                <Users className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <div className="mt-8 text-center border-t border-slate-800 pt-4">
              <p className="text-[10px] text-slate-500 font-mono">
                No database sign-ups or user profiles required.
              </p>
            </div>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 shadow-2xl relative"
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-display font-semibold text-white">Create Room</h2>
            </div>

            {errorCode && (
              <div id="create-error" className="mb-4 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorCode}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Your Alias / Name</label>
                <input
                  id="create-username"
                  type="text"
                  required
                  placeholder="e.g. Alice"
                  maxLength={15}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm rounded-lg bg-slate-950 border border-slate-800 text-white px-3 py-2 fill-none outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-0.5">Room Code</label>
                <div className="flex gap-2">
                  <input
                    id="create-roomcode"
                    type="text"
                    required
                    placeholder="e.g. MY-ROOM"
                    maxLength={15}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full text-sm rounded-lg bg-slate-950 border border-slate-800 text-white px-3 py-2 outline-none font-mono tracking-widest focus:border-blue-500 transition-colors uppercase placeholder:text-slate-600"
                  />
                  <button
                    id="btn-regenerate-code"
                    type="button"
                    onClick={generateCode}
                    title="Generate Safe Code"
                    className="px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Leave as generated or create custom name.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-400">Maximum Members Limit</label>
                  <span className="text-xs font-mono font-medium text-blue-400 bg-blue-950/50 border border-blue-900/30 px-1.5 py-0.5 rounded">
                    {maxMembers} Users
                  </span>
                </div>
                <input
                  id="create-maxmembers"
                  type="range"
                  min="2"
                  max="50"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-0.5">
                  <span>2 Min</span>
                  <span>50 Max</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="btn-create-back"
                  type="button"
                  onClick={() => {
                    setView('options');
                    setErrorCode('');
                  }}
                  className="w-1/3 py-2 text-xs rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="btn-create-submit"
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-950/50 hover:shadow-blue-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    'Creating...'
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Initialize Room
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 shadow-2xl relative"
          >
            <div className="flex items-center gap-2 mb-6">
              <DoorOpen className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-display font-semibold text-white">Join Room</h2>
            </div>

            {errorCode && (
              <div id="join-error" className="mb-4 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorCode}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Your Alias / Name</label>
                <input
                  id="join-username"
                  type="text"
                  required
                  placeholder="e.g. Bob"
                  maxLength={15}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm rounded-lg bg-slate-950 border border-slate-800 text-white px-3 py-2 fill-none outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Room Code</label>
                <input
                  id="join-roomcode"
                  type="text"
                  required
                  placeholder="e.g. RM-ABCDEF"
                  maxLength={15}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full text-sm rounded-lg bg-slate-950 border border-slate-800 text-white px-3 py-2 outline-none font-mono tracking-widest focus:border-emerald-500 transition-colors uppercase placeholder:text-slate-600"
                />

                {/* Instant validation badge info */}
                {roomInfo && (
                  <div className={`mt-1.5 flex items-center justify-between border rounded px-2 py-1 text-[10px] ${
                    isCurrentUserAdmin
                      ? 'bg-amber-950/30 border-amber-950/60 text-amber-300'
                      : 'bg-emerald-950/30 border-emerald-900/30 text-emerald-300'
                  }`}>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isCurrentUserAdmin ? '👑 Admin Session Recognized' : 'Valid Active Room'}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[9px]">
                      Spaces: {roomInfo.currentMembers}/{roomInfo.maxMembers}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button
                    id="btn-join-back"
                    type="button"
                    onClick={() => {
                      setView('options');
                      setErrorCode('');
                      setRoomInfo(null);
                    }}
                    className="w-1/3 py-2 text-xs rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    id="btn-join-submit"
                    type="submit"
                    disabled={loading || (roomInfo !== null && roomInfo.isFull && !isCurrentUserAdmin)}
                    className={`w-2/3 py-2 text-xs font-medium rounded-lg shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isCurrentUserAdmin
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-950/50 hover:shadow-indigo-500/10'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 hover:shadow-emerald-500/10'
                    }`}
                  >
                    {loading ? (
                      'Verifying...'
                    ) : isCurrentUserAdmin ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Resume Admin Room
                      </>
                    ) : roomInfo?.isFull ? (
                      'Room is Full'
                    ) : (
                      <>
                        <DoorOpen className="w-3.5 h-3.5" /> Request Access
                      </>
                    )}
                  </button>
                </div>

                {isCurrentUserAdmin && (
                  <button
                    id="btn-admin-delete-outside"
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteRoom}
                    className="w-full py-2 text-xs font-medium rounded-lg text-red-400 hover:text-white bg-red-950/20 hover:bg-red-600 border border-red-900/40 hover:border-red-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'Shutting down...' : 'Terminate & Delete Room'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
