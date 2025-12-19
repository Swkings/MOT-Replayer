
import React from 'react';
import { SkipBack, Pause, Play, SkipForward } from 'lucide-react';
import { formatFullTimestamp } from '../functions/formatters';

interface PlaybackControlsProps {
  currentIndex: number;
  frameCount: number;
  isPlaying: boolean;
  timestamp: number;
  playbackSpeed: number;
  onSeek: (idx: number) => void;
  onTogglePlayback: () => void;
  onStep: (direction: number) => void;
  onSpeedChange: (speed: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentIndex, frameCount, isPlaying, timestamp, playbackSpeed,
  onSeek, onTogglePlayback, onStep, onSpeedChange
}) => {
  return (
    <div className="h-32 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 flex flex-col justify-center px-10 gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-40">
      <div className="flex items-center gap-6">
        <span className="text-[10px] font-mono text-slate-600 w-12">{currentIndex + 1}</span>
        <input
          type="range" min={0} max={frameCount - 1} value={currentIndex}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600"
        />
        <span className="text-[10px] font-mono text-slate-600 w-12 text-right">{frameCount}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Precise Clock Reconstruction</span>
          <span className="text-xs font-mono font-bold text-blue-400 tracking-tight">{formatFullTimestamp(timestamp)}</span>
        </div>

        <div className="flex items-center gap-8">
          <button onClick={() => onStep(-1)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"><SkipBack size={24} /></button>
          <button onClick={onTogglePlayback} className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-3xl flex items-center justify-center transition-all shadow-2xl shadow-blue-600/30 active:scale-90 group">
            {isPlaying ? <Pause size={32} className="fill-white text-white" /> : <Play size={32} className="fill-white text-white translate-x-1" />}
          </button>
          <button onClick={() => onStep(1)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"><SkipForward size={24} /></button>
        </div>

        <div className="flex items-center gap-6 bg-white/5 px-5 py-2 rounded-2xl border border-white/5">
          <div className="flex flex-col items-center">
             <span className="text-[8px] text-slate-600 font-black uppercase">Time Scale</span>
             <select value={playbackSpeed} onChange={(e) => onSpeedChange(parseFloat(e.target.value))} className="bg-transparent border-none text-xs font-black text-blue-400 focus:ring-0 cursor-pointer p-0">
                {[0.1, 0.5, 1, 2, 5].map(v => <option key={v} value={v}>{v.toFixed(1)}x</option>)}
             </select>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
             <span className="text-[8px] text-slate-600 font-black uppercase">Buffered</span>
             <span className="text-xs font-mono font-bold text-white tracking-tighter">
                {Math.round((currentIndex / (frameCount - 1 || 1)) * 100)}%
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;
