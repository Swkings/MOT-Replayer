
import React from 'react';
import { Eye, EyeOff, Plus, Minus, Maximize, Maximize2, Minimize2, RotateCw, Wifi } from 'lucide-react';

interface TelemetryPanelProps {
  speed: number;
  yawRate?: number;
  isFollowing: boolean;
  isFullScreen: boolean;
  isLive?: boolean;
  opacity?: number;
  onToggleFollow: () => void;
  onToggleFullScreen: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
}

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  speed, yawRate = 0, isFollowing, isFullScreen, isLive, opacity = 0.9, onToggleFollow, onToggleFullScreen, onZoomIn, onZoomOut, onResetCamera
}) => {
  return (
    <div className="absolute top-6 right-6 z-20 flex flex-col gap-4 items-end">
      <div 
        className="border border-white/5 p-6 rounded-[2.5rem] shadow-2xl min-w-[240px] relative"
        style={{ 
          backgroundColor: `rgba(15, 23, 42, ${opacity})`,
          backdropFilter: `blur(${opacity * 24}px)`
        }}
      >
        {isLive && (
          <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg live-pulse z-10">
            <Wifi size={10} className="animate-pulse" />
            Live Feed
          </div>
        )}
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Navigation Telemetry</div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black italic tracking-tighter ${speed < 0 ? 'text-red-500' : 'text-blue-500'}`}>
              {(speed * 3.6).toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">KM/H</span>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Yaw Rate</span>
              <span className="text-sm font-mono font-bold text-slate-200 flex items-center gap-1">
                <RotateCw size={12} className="text-blue-400" />
                {yawRate.toFixed(3)} <span className="text-[10px] text-slate-600">rad/s</span>
              </span>
            </div>
            
            <button 
              onClick={onToggleFollow}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {isFollowing ? <Eye size={12} /> : <EyeOff size={12} />}
              {isFollowing ? 'Tracking' : 'Free'}
            </button>
          </div>
        </div>
      </div>

      <div 
        className="flex flex-col gap-2 border border-white/5 p-2 rounded-2xl shadow-xl"
        style={{ 
          backgroundColor: `rgba(15, 23, 42, ${opacity})`,
          backdropFilter: `blur(${opacity * 24}px)`
        }}
      >
        <button onClick={onZoomIn} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white transition-all text-slate-400" title="Zoom In"><Plus size={20} /></button>
        <button onClick={onZoomOut} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white transition-all text-slate-400" title="Zoom Out"><Minus size={20} /></button>
        <div className="h-px bg-white/5 mx-2" />
        <button onClick={onResetCamera} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white transition-all text-slate-400" title="Reset View"><Maximize size={18} /></button>
        <div className="h-px bg-white/5 mx-2" />
        <button 
          onClick={onToggleFullScreen} 
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isFullScreen ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
          title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
};

export default TelemetryPanel;
