
import React, { useState } from 'react';
import { Home, Save, RotateCcw, Box, Terminal } from 'lucide-react';
import ObjectInspector from './ObjectInspector';
import { MOTFrame } from '../types';
import RawDataView from './RawDataView';

interface AppSidebarProps {
  instanceName: string;
  currentFrame: MOTFrame;
  selectedId: number | null;
  hoveredId: number | null;
  latestRaw?: string;
  onHome: () => void;
  onSave: () => void;
  onReset: () => void;
  onSelectObject: (id: number | null) => void;
  onHoverObject: (id: number | null) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  instanceName, currentFrame, selectedId, onHome, onSave, onReset, onSelectObject, onHoverObject, latestRaw
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'raw'>('inspector');

  return (
    <aside className="w-[420px] border-r border-white/5 flex flex-col bg-slate-900/40 backdrop-blur-3xl z-40">
      <div className="p-6 border-b border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onHome} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all active:scale-95">
              <Home size={20} className="text-white" />
            </button>
            <h1 className="text-xs font-black tracking-widest text-white uppercase italic truncate max-w-[180px]">
              {instanceName || 'SESSION'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-green-400 transition-all" title="Save Session"><Save size={18} /></button>
            <button onClick={onReset} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all" title="Reset Playback"><RotateCcw size={18} /></button>
          </div>
        </div>

        {/* Tab Selector */}
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
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'inspector' ? (
          <ObjectInspector 
            objects={currentFrame.objs} 
            navi={currentFrame.navi}
            selectedId={selectedId}
            onSelect={onSelectObject}
            onHover={onHoverObject}
          />
        ) : (
          <RawDataView data={latestRaw || ''} />
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
