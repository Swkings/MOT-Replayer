
import React, { useState, useMemo } from 'react';
import { Home, Save, RotateCcw, Box, Terminal, ChevronLeft, ChevronRight, Activity, Cpu, Zap, PauseCircle, Download, LayoutTemplate, Columns, Rows, Grid, Wifi, MoreVertical, Trash2, Settings, Monitor, Eye, Ghost } from 'lucide-react';
import ObjectInspector from './ObjectInspector';
import { MOTFrame, MOTInstance, LayoutMode, SlotData } from '../types';
import RawDataView from './RawDataView';

interface AppSidebarProps {
  instanceName: string;
  currentFrame: MOTFrame;
  selectedId: number | null;
  hoveredId: number | null;
  latestRaw?: string;
  isCollapsed?: boolean;
  instances: MOTInstance[];
  layoutMode: LayoutMode;
  slots: (SlotData | null)[];
  uiOpacity: number;
  setUiOpacity: (val: number) => void;
  onHome: () => void;
  onSave: () => void;
  onExport: () => void;
  onReset: () => void;
  onSelectObject: (id: number | null) => void;
  onHoverObject: (id: number | null) => void;
  onToggleCollapse: () => void;
  onChangeLayout: (mode: LayoutMode) => void;
  onLoadInstanceToSlot: (inst: MOTInstance) => void;
  onDeleteInstance: (id: string, e: React.MouseEvent) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  instanceName, currentFrame, selectedId, hoveredId, onHome, onSave, onExport, onReset, onSelectObject, onHoverObject, latestRaw,
  isCollapsed = false, onToggleCollapse, instances, layoutMode, slots, uiOpacity, setUiOpacity, onChangeLayout, onLoadInstanceToSlot, onDeleteInstance
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'raw' | 'library'>('inspector');
  const [showSettings, setShowSettings] = useState(false);

  // Categorize objects for mini mode display
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

  const renderLayoutControls = () => {
    if (isCollapsed) return null;
    return (
      <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl mb-4">
        <button onClick={() => onChangeLayout('SINGLE')} className={`flex-1 p-1.5 rounded-lg flex justify-center transition-all ${layoutMode === 'SINGLE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Single View"><LayoutTemplate size={14} /></button>
        <button onClick={() => onChangeLayout('SPLIT_V')} className={`flex-1 p-1.5 rounded-lg flex justify-center transition-all ${layoutMode === 'SPLIT_V' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Split Vertical"><Columns size={14} /></button>
        <button onClick={() => onChangeLayout('SPLIT_H')} className={`flex-1 p-1.5 rounded-lg flex justify-center transition-all ${layoutMode === 'SPLIT_H' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Split Horizontal"><Rows size={14} /></button>
        <button onClick={() => onChangeLayout('GRID')} className={`flex-1 p-1.5 rounded-lg flex justify-center transition-all ${layoutMode === 'GRID' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Grid 2x2"><Grid size={14} /></button>
      </div>
    );
  };

  // Dynamic Background and Blur
  // When uiOpacity is 0 (Ghost Mode), we ensure background is fully transparent (alpha 0) and no blur.
  const sidebarStyle = {
    backgroundColor: `rgba(15, 23, 42, ${isCollapsed ? 0.9 : uiOpacity})`,
    borderColor: `rgba(255, 255, 255, ${Math.min(0.05, uiOpacity * 0.05)})`,
    backdropFilter: `blur(${isCollapsed ? 20 : uiOpacity * 24}px)`
  };

  const isGhostMode = uiOpacity === 0;

  return (
    <aside 
      style={sidebarStyle}
      className={`border-r flex flex-col z-[60] transition-all duration-500 ease-in-out relative h-full ${
        isCollapsed ? 'w-24' : 'w-[420px]'
      }`}
    >
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
            <button onClick={onHome} className="w-10 h-10 min-w-[40px] rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all active:scale-95" title="Back to Home">
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
               <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`} 
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button onClick={onSave} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-green-400 transition-all" title="Save Session"><Save size={18} /></button>
              <button onClick={onExport} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-blue-400 transition-all" title="Export JSON"><Download size={18} /></button>
              <button onClick={onReset} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all" title="Reset Playback"><RotateCcw size={18} /></button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               <button onClick={onSave} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-green-600/20 text-slate-500 hover:text-green-400 flex items-center justify-center transition-all"><Save size={18} /></button>
            </div>
          )}
        </div>

        {/* Transparency / Ghost Mode Settings Panel */}
        {!isCollapsed && showSettings && (
          <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 shadow-2xl z-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isGhostMode ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Ghost size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">Ghost Mode</span>
                  <span className="text-[9px] text-slate-400 font-medium">Full Transparency</span>
                </div>
              </div>
              
              <button 
                onClick={() => setUiOpacity(isGhostMode ? 0.95 : 0)}
                className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${isGhostMode ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                 <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${isGhostMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}

        {renderLayoutControls()}

        {!isCollapsed ? (
          <div className="flex p-1 bg-slate-800/50 rounded-2xl">
            <button 
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'inspector' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <Box size={14} /> Inspector
            </button>
            <button 
              onClick={() => setActiveTab('raw')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'raw' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <Terminal size={14} /> Raw
            </button>
             <button 
              onClick={() => setActiveTab('library')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'library' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <Activity size={14} /> Library
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${activeTab === 'inspector' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`} onClick={() => setActiveTab('inspector')}><Box size={20} /></div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${activeTab === 'library' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`} onClick={() => setActiveTab('library')}><Activity size={20} /></div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {!isCollapsed && activeTab === 'library' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
              Click to load into active view
            </div>
            {instances.map(inst => {
              const activeSlotIndices = slots.map((s, idx) => s?.instanceId === inst.id ? idx + 1 : null).filter(n => n !== null);
              return (
                <div 
                  key={inst.id} 
                  onClick={() => onLoadInstanceToSlot(inst)}
                  className={`p-3 bg-slate-800/40 border border-white/5 rounded-2xl cursor-pointer hover:bg-slate-700/60 hover:border-blue-500/30 transition-all group ${inst.name === instanceName ? 'ring-1 ring-blue-500 bg-blue-500/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {inst.sourceType === 'LOG' ? <Activity size={14} className="text-blue-400 shrink-0" /> : <Wifi size={14} className="text-red-400 shrink-0" />}
                      <span className="text-xs font-bold text-slate-200 truncate">{inst.name}</span>
                    </div>
                    <button onClick={(e) => onDeleteInstance(inst.id, e)} className="p-1 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded-lg shrink-0"><Trash2 size={12} /></button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                     <div className="flex gap-1">
                       {activeSlotIndices.length > 0 ? activeSlotIndices.map(i => (
                          <span key={i} className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                             <Monitor size={8} /> VIEW {i}
                          </span>
                       )) : (
                         <span className="text-[9px] text-slate-500 font-mono">{inst.sourceType === 'LOG' ? `${inst.frameCount} F` : 'STREAM'}</span>
                       )}
                     </div>
                     <span className="text-[9px] text-slate-600 font-mono">{new Date(inst.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
            {instances.length === 0 && <div className="text-center text-slate-600 italic text-xs py-10">Library Empty</div>}
          </div>
        ) : !isCollapsed ? (
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
             <div className="grid grid-cols-2 w-full px-2 border-b border-white/5 pb-2">
               <div className="flex flex-col items-center gap-1"><Zap size={14} className="text-yellow-500" /></div>
               <div className="flex flex-col items-center gap-1"><PauseCircle size={14} className="text-blue-400" /></div>
             </div>
             <div className="flex-1 overflow-y-auto w-full grid grid-cols-2 gap-2 px-2 custom-scrollbar content-start pb-20">
                <div className="flex flex-col gap-2">{moving.slice(0, 30).map(renderMiniItem)}</div>
                <div className="flex flex-col gap-2">{stationary.slice(0, 30).map(renderMiniItem)}</div>
             </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
