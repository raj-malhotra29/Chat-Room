import { motion } from 'motion/react';
import { ShieldAlert, Loader2, ArrowLeft, RefreshCw, BadgeHelp } from 'lucide-react';
import { Room, User } from '../types';

interface QueueRoomProps {
  room: Room;
  user: User;
  onCancel: () => void;
}

export default function QueueRoom({ room, user, onCancel }: QueueRoomProps) {
  return (
    <div id="queue-room" className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 shadow-2xl relative text-center overflow-hidden"
      >
        {/* Animated Background subtle glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl animate-pulse-slow" />

        <div className="relative z-10">
          {/* Main Visual Indicator: Glowing ring loader */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-dashed border-indigo-500/30 border-t-indigo-400"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-2 rounded-full border border-dashed border-blue-500/20 border-b-blue-400"
            />
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>

          <div className="mb-2">
            <span className="text-[10px] font-mono tracking-widest font-semibold uppercase text-indigo-400 bg-indigo-950/50 border border-indigo-900/40 px-2.5 py-0.75 rounded-full">
              Join Request Sent
            </span>
          </div>

          <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
            Awaiting Admin Review
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2">
            Hey <span className="font-semibold text-slate-200">{user.username}</span>, your request to enter the room has been broadcasted to the room creator!
          </p>

          {/* Details Box */}
          <div className="mt-6 border border-slate-800/80 bg-slate-950/60 rounded-xl p-4 text-left space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Room Target</span>
              <span className="font-mono text-white tracking-wider font-semibold">
                {room.roomCode}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-3">
              <span className="text-slate-500 font-medium">Your Role</span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-300 font-semibold uppercase px-2 py-0.5 rounded-md font-mono">
                MEMBER
              </span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-3">
              <span className="text-slate-500 font-medium">Current Status</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2.5 py-0.75 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                PENDING APPROVAL
              </span>
            </div>
          </div>

          {/* Friendly prompt */}
          <div className="mt-5 flex items-start gap-2 bg-slate-950/30 border border-slate-800/40 p-3 rounded-lg text-left text-[11px] text-slate-400">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Please keep this screen open. Once the administrator clicks <strong>Approve</strong>, you will automatically connect to the real-time chat interface.
            </p>
          </div>

          {/* Cancel button */}
          <div className="mt-6 flex justify-center gap-2">
            <button
              id="cancel-queue-request"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Leave Queue
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
