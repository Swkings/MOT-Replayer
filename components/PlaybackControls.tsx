
import React, { useState, useEffect, useRef } from 'react';
import { SkipBack, Pause, Play, SkipForward, Pin, PinOff } from 'lucide-react';
import { formatFullTimestamp } from '../functions/formatters';

interface PlaybackControlsProps {
  currentIndex: number;
  frameCount: number;
  isPlaying: boolean;
  timestamp: number;
  playbackSpeed: number;
  isLive?: boolean;
  opacity?: number;
  onSeek: (idx: number) => void;
  onTogglePlayback: () => void;
  onStep: (direction: number) => void;
  onSpeedChange: (speed: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentIndex, frameCount, isPlaying, timestamp, playbackSpeed, isLive, opacity = 0.9,
  onSeek, onTogglePlayback, onStep, onSpeedChange
}) => {
  const [isPinned, setIsPinned] = useState(true); // Default: Pinned (fixed)
  const [isHovered, setIsHovered] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [autoHideTimerVisible, setAutoHideTimerVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  // Monitor mouse position for proximity activation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If mouse is in bottom 120px of the screen
      const threshold = window.innerHeight - 120;
      if (e.clientY > threshold) {
        setIsNearBottom(true);
      } else {
        setIsNearBottom(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 5s Auto-hide logic for Unpinned state
  useEffect(() => {
    if (isPinned) {
      // If pinned, always show
      setAutoHideTimerVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }

    // When unpinned:
    if (isHovered || isNearBottom) {
      // Reset timer if hovered or near
      setAutoHideTimerVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      // Start 5s countdown when mouse leaves and isn't near bottom
      if (!hideTimerRef.current) {
        hideTimerRef.current = window.setTimeout(() => {
          setAutoHideTimerVisible(false);
          hideTimerRef.current = null;
        }, 5000);
      }
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPinned, isHovered, isNearBottom]);

  const shouldShow = isPinned || autoHideTimerVisible || isHovered || isNearBottom;

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute bottom-0 left-0 right-0 z-[80] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${
        shouldShow ? 'translate-y-0 opacity-100' : 'translate-y-[calc(100%-12px)] opacity-30 pointer-events-none'
      }`}
    >
      {/* Invisible but interactive trigger zone when hidden */}
      {!shouldShow && (
        <div className="absolute -top-10 left-0 right-0 h-10 pointer-events-auto cursor-pointer" />
      )}

      <div 
        className={`w-full px-10 py-6 border-t border-white/10 shadow-[0_-30px_60px_rgba(0,0,0,0.7)] flex flex-col gap-4 pointer-events-auto`}
        style={{ 
          backgroundColor: `rgba(15, 23, 42, ${opacity})`,
          backdropFilter: `blur(${opacity * 24}px)`
        }}
      >
        {!isLive ? (
          <>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-mono text-slate-500 w-12">{currentIndex + 1}</span>
              <input
                type="range" min={0} max={frameCount - 1} value={currentIndex}
                onChange={(e) => onSeek(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] font-mono text-slate-500 w-12 text-right">{frameCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Timeline Reconstruction</span>
                <span className="text-xs font-mono font-bold text-blue-400 tracking-tight">{formatFullTimestamp(timestamp)}</span>
              </div>

              <div className="flex items-center gap-8">
                <button onClick={() => onStep(-1)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"><SkipBack size={24} /></button>
                <button 
                  onClick={onTogglePlayback} 
                  className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center transition-all shadow-2xl shadow-blue-600/30 active:scale-90 group" 
                  title="Space to Play/Pause"
                >
                  {isPlaying ? <Pause size={32} className="fill-white text-white" /> : <Play size={32} className="fill-white text-white translate-x-1" />}
                </button>
                <button onClick={() => onStep(1)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"><SkipForward size={24} /></button>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-white/5 px-5 py-2 rounded-2xl border border-white/5">
                  <div className="flex flex-col items-center">
                     <span className="text-[8px] text-slate-600 font-black uppercase">Speed</span>
                     <select value={playbackSpeed} onChange={(e) => onSpeedChange(parseFloat(e.target.value))} className="bg-transparent border-none text-xs font-black text-blue-400 focus:ring-0 cursor-pointer p-0">
                        {[0.1, 0.5, 1, 2, 5].map(v => <option key={v} value={v} className="bg-slate-900">{v.toFixed(1)}x</option>)}
                     </select>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center min-w-[60px]">
                     <span className="text-[8px] text-slate-600 font-black uppercase">Buffered</span>
                     <span className="text-xs font-mono font-bold text-white tracking-tighter">
                        {Math.round((currentIndex / (frameCount - 1 || 1)) * 100)}%
                     </span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-3 rounded-2xl border transition-all ${isPinned ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-white'}`}
                  title={isPinned ? "Unpin Controls" : "Pin Controls"}
                >
                  {isPinned ? <Pin size={18} /> : <PinOff size={18} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)] live-pulse" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Stream Buffer</span>
                 <span className="text-sm font-mono font-bold text-white tracking-tight">{frameCount} frames ingested</span>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPinned(!isPinned)}
                className={`p-3 rounded-2xl border transition-all ${isPinned ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-white'}`}
                title={isPinned ? "Unpin Controls" : "Pin Controls"}
              >
                {isPinned ? <Pin size={18} /> : <PinOff size={18} />}
              </button>
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Live Reconstruction Clock</span>
                <span className="text-lg font-mono font-bold text-red-500 tracking-tight">
                  {timestamp ? new Date(timestamp * 1000).toLocaleTimeString() : '--:--:--'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaybackControls;
