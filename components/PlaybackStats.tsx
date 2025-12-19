
import React, { useState, useEffect, useRef } from 'react';
import { Activity, LayoutGrid, Clock, Zap } from 'lucide-react';

interface PlaybackStatsProps {
  currentIndex: number;
  totalFrames: number;
  isLive?: boolean;
}

const PlaybackStats: React.FC<PlaybackStatsProps> = ({ currentIndex, totalFrames, isLive }) => {
  // Render FPS (UI/Canvas)
  const [renderFps, setRenderFps] = useState(0);
  const renderFrameCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  // Data FPS (Processing/Playback)
  const [dataFps, setDataFps] = useState(0);
  
  // Use refs to track latest props without triggering effect re-runs
  const latestIndexRef = useRef(currentIndex);
  const latestTotalRef = useRef(totalFrames);
  
  // History refs for the interval calculation
  const lastDataIndexRef = useRef(currentIndex);
  const lastDataTotalRef = useRef(totalFrames);
  const lastDataTimeRef = useRef(performance.now());

  // Update tracking refs on every prop change
  useEffect(() => {
    latestIndexRef.current = currentIndex;
    latestTotalRef.current = totalFrames;
  }, [currentIndex, totalFrames]);

  // High-precision Render FPS calculation (UI smoothness)
  useEffect(() => {
    let rafId: number;
    const updateRenderFps = () => {
      renderFrameCountRef.current++;
      const now = performance.now();
      const delta = now - lastRenderTimeRef.current;

      if (delta >= 1000) {
        setRenderFps(Math.round((renderFrameCountRef.current * 1000) / delta));
        renderFrameCountRef.current = 0;
        lastRenderTimeRef.current = now;
      }
      rafId = requestAnimationFrame(updateRenderFps);
    };

    rafId = requestAnimationFrame(updateRenderFps);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Stable Data FPS Calculation Logic (Throughput)
  useEffect(() => {
    // Reset history when mode changes or effect starts
    lastDataIndexRef.current = latestIndexRef.current;
    lastDataTotalRef.current = latestTotalRef.current;
    lastDataTimeRef.current = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const timeDelta = (now - lastDataTimeRef.current) / 1000;
      
      let dataDelta = 0;
      if (isLive) {
        // In live mode, we track how many new frames were added to the buffer
        dataDelta = latestTotalRef.current - lastDataTotalRef.current;
      } else {
        // In replay mode, we track how many frames the cursor moved (absolute distance)
        dataDelta = Math.abs(latestIndexRef.current - lastDataIndexRef.current);
      }

      // Calculate and update state
      const fpsValue = Math.round(dataDelta / (timeDelta || 1));
      setDataFps(fpsValue);
      
      // Update history for next tick
      lastDataIndexRef.current = latestIndexRef.current;
      lastDataTotalRef.current = latestTotalRef.current;
      lastDataTimeRef.current = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]); // Only restart if the live/replay mode changes

  const progressPercent = totalFrames > 0 ? Math.round(((currentIndex + 1) / totalFrames) * 100) : 0;
  
  const getFpsColor = (val: number) => 
    val >= 50 ? 'text-green-400' : val >= 20 ? 'text-yellow-400' : 'text-red-400';

  const getSaturateClass = (val: number) => 
    val > 0 ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]' : '';

  return (
    <div className="bg-slate-900/70 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-5 min-w-[240px] pointer-events-auto border-t-white/20">
      {/* Dual FPS Header */}
      <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-60">
            <LayoutGrid size={10} className="text-slate-400" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Render Rate</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-mono font-black ${getFpsColor(renderFps)} ${getSaturateClass(renderFps)}`}>
              {renderFps}
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase">Hz</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-l border-white/5 pl-4">
          <div className="flex items-center gap-1.5 opacity-60">
            <Zap size={10} className="text-blue-400" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Data Rate</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-mono font-black ${dataFps > 0 ? 'text-blue-400' : 'text-slate-600'} ${dataFps > 0 ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : ''}`}>
              {dataFps}
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase">FPS</span>
          </div>
        </div>
      </div>

      {/* Progress Tracking */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} className="text-slate-600" />
              {isLive ? 'Buffer Capacity' : 'Session Timeline'}
            </span>
            <span className="text-xs font-mono font-bold text-white tracking-tighter">
              {isLive ? totalFrames : `${currentIndex + 1} / ${totalFrames}`}
            </span>
          </div>
          
          {!isLive && (
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Dynamic Status Tag */}
        <div className="flex items-center justify-between pt-1">
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${isLive ? 'text-red-500' : 'text-blue-400'}`}>
                {isLive ? 'Link: Streaming' : progressPercent >= 100 ? 'End of Log' : 'Engine: Active'}
              </span>
           </div>
           {!isLive && <span className="text-[9px] font-mono font-black text-slate-600">{progressPercent}%</span>}
        </div>
      </div>
    </div>
  );
};

export default PlaybackStats;
