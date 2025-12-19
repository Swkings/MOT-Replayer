
import React, { useState } from 'react';
import { KIND_COLORS, KIND_LABELS } from '../constants';
import { ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react';

interface LegendProps {
  opacity?: number;
}

const Legend: React.FC<LegendProps> = ({ opacity = 0.9 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const visibleKinds = [0, 1, 2, 3, 5, 11, 15]; // Most common ones

  return (
    <div 
      className={`border border-white/5 rounded-[1.5rem] shadow-2xl transition-all duration-300 ease-in-out ${isCollapsed ? 'w-12 h-12 overflow-hidden' : 'p-5 min-w-[160px]'}`}
      style={{ 
        backgroundColor: `rgba(15, 23, 42, ${opacity})`,
        backdropFilter: `blur(${opacity * 24}px)`
      }}
    >
      <div className="flex items-center justify-between mb-2">
        {!isCollapsed && (
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 flex-1 mr-4">Map Legend</h3>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors ${isCollapsed ? 'm-1' : ''}`}
          title={isCollapsed ? "Expand Legend" : "Collapse Legend"}
        >
          {isCollapsed ? <MapIcon size={20} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {visibleKinds.map(kind => (
            <div key={kind} className="flex items-center gap-3 group">
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-125" 
                style={{ backgroundColor: KIND_COLORS[kind] || '#6b7280' }} 
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-slate-200 transition-colors">
                {KIND_LABELS[kind] || 'Other'}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-3 group">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-tight">Host Vehicle</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Legend;
