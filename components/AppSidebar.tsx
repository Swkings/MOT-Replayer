
import React, { useState, useMemo } from 'react';
import { Home, Save, RotateCcw, Box, Terminal, ChevronLeft, ChevronRight, Activity, Cpu, Zap, PauseCircle } from 'lucide-react';
import ObjectInspector from './ObjectInspector';
import { MOTFrame } from '../types';
import RawDataView from './RawDataView';

interface AppSidebarProps {
  instanceName: string;
  currentFrame: MOTFrame;
  selectedId: number | null;
  hoveredId: number | null;
  latestRaw?: string;
  isCollapsed?: boolean;
  onHome: () => void;
  onSave: () => void;
  onReset: () => void;
  onSelectObject: (id: number | null) => void;
  onHoverObject: (id: number | null) => void;
  onToggleCollapse: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  instanceName, currentFrame, selectedId, hoveredId, onHome, onSave, onReset, onSelectObject, onHoverObject, latestRaw,
  isCollapsed = false, onToggleCollapse
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'raw'>('inspector');

  // Categorize objects for mini mode display
  // Logic: Moving > 0, Static <= 0
  const { moving, stationary } = useMemo(() => {
    return {
      moving: currentFrame.objs.filter(o => o.vel > 0),
      stationary: currentFrame.objs.filter(o => o.vel <= 0)
    };
  }, [currentFrame.objs]);

  const renderMiniItem = (obj: any) => {
    const isSelected = selectedId === obj.id;
    return (
      <button 
        key={obj.id} 
        onClick={() => onSelectObject(isSelected ? null : obj.id)}
        onMouseEnter={() => onHoverObject(obj.id)}
        onMouseLeave={() => onHoverObject(null)}
        className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center transition-all border shrink-0 ${
          isSelected 
            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
            : 'bg-slate-800/40 border-white/5 text-slate-500 hover:text-white hover:border-blue-500/50'
        }`}
      >
        <span className="text-[9px] font-mono font-black leading-none">{obj.id}</span>
        <span className={`text-[7px] font-bold leading-none mt-1 ${isSelected ? 'text-white' : 'text-blue-400'}`}>
          {Math.round(obj.vel)}
        </span>
      </button>
    );
  };

  return (
    <aside 
      className={`border-r border-white/5 flex flex-col bg-slate-900/60 backdrop-blur-3xl z-[60] transition-all duration-500 ease-in-out relative h-full ${
        isCollapsed ? 'w-24' : 'w-[420px]'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-12 bg-slate-800 border border-white/10 rounded-r-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 transition-all z-[70] shadow-xl"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Header Area */}
      <div className={`p-6 border-b border-white/5 flex flex-col gap-4 ${isCollapsed ? 'items-center px-2' : ''}`}>
        <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col gap-4' : ''}`}>
          <div className="flex items-center gap-3">
            <button onClick={onHome} className="w-10 h-10 min-w-[40px] rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all active:scale-95">
              <Home size={20} className="text-white" />
            </button>
            {!isCollapsed && (
              <h1 className="text-xs font-black tracking-widest text-white uppercase italic truncate max-w-[180px]">
                {instanceName || 'SESSION'}
              </h1>
            )}
          </div>
          
          {!isCollapsed ? (
            <div className="flex gap-2">
              <button onClick={onSave} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-green-400 transition-all" title="Save Session"><Save size={18} /></button>
              <button onClick={onReset} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all" title="Reset Playback"><RotateCcw size={18} /></button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button onClick={onSave} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-green-600/20 text-slate-500 hover:text-green-400 flex items-center justify-center transition-all"><Save size={18} /></button>
              <button onClick={onReset} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-white/10 text-slate-500 hover:text-white flex items-center justify-center transition-all"><RotateCcw size={18} /></button>
            </div>
          )}
        </div>

        {/* Tab Selector / Mini Status */}
        {!isCollapsed ? (
          <div className="flex p-1 bg-slate-800 rounded-2xl">
            <button 
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'inspector' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <Box size={14} />
              Inspector
            </button>
            <button 
              onClick={() => setActiveTab('raw')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'raw' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <Terminal size={14} />
              Raw Payload
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activeTab === 'inspector' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`} onClick={() => setActiveTab('inspector')} title="Inspector Mode">
              <Box size={20} />
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activeTab === 'raw' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`} onClick={() => setActiveTab('raw')} title="Raw Console">
              <Terminal size={20} />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {!isCollapsed ? (
          activeTab === 'inspector' ? (
            <ObjectInspector 
              objects={currentFrame.objs} 
              navi={currentFrame.navi}
              selectedId={selectedId}
              onSelect={onSelectObject}
              onHover={onHoverObject}
            />
          ) : (
            <RawDataView data={latestRaw || ''} />
          )
        ) : (
          <div className="flex-1 flex flex-col items-center py-4 gap-4 overflow-hidden">
             <div className="flex flex-col items-center gap-1 group">
                <Activity size={18} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-400">{currentFrame.objs.length}</span>
             </div>
             
             {/* Dual-Column Header Icons */}
             <div className="grid grid-cols-2 w-full px-2 border-b border-white/5 pb-2">
               <div className="flex flex-col items-center gap-1" title="Moving Objects">
                 <Zap size={14} className="text-yellow-500" />
                 <span className="text-[7px] font-black text-slate-600 uppercase">MOV</span>
               </div>
               <div className="flex flex-col items-center gap-1" title="Static Objects">
                 <PauseCircle size={14} className="text-blue-400" />
                 <span className="text-[7px] font-black text-slate-600 uppercase">STAT</span>
               </div>
             </div>

             {/* Two Distinct Columns */}
             <div className="flex-1 overflow-y-auto w-full grid grid-cols-2 gap-2 px-2 custom-scrollbar content-start pb-20">
                <div className="flex flex-col gap-2">
                  {moving.slice(0, 30).map(renderMiniItem)}
                </div>
                <div className="flex flex-col gap-2">
                  {stationary.slice(0, 30).map(renderMiniItem)}
                </div>
                {(moving.length > 30 || stationary.length > 30) && (
                   <div className="col-span-2 py-2 text-center text-[7px] text-slate-700 font-black uppercase tracking-tighter">List Cap</div>
                )}
             </div>
             
             <div className="mt-auto mb-2 flex flex-col items-center gap-1 opacity-50">
                <Cpu size={14} className="text-slate-600" />
                <span className="text-[8px] font-black text-slate-700 uppercase">3D-V</span>
             </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
