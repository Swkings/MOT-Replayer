
import React, { useState, useMemo } from 'react';
import { MOTObject, NaviData } from '../types';
import { KIND_LABELS, KIND_COLORS } from '../constants';
import { Activity, ArrowDownAZ, ArrowUpAZ, LocateFixed, Navigation, Zap, PauseCircle, Box, Compass, Search, X } from 'lucide-react';
import { getObjectDimensions } from '../functions/spatialUtils';

interface ObjectInspectorProps {
  objects: MOTObject[];
  navi: NaviData;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onHover: (id: number | null) => void;
}

type SortMode = 'dist-asc' | 'dist-desc' | 'id-asc' | 'id-desc';

const ObjectInspector: React.FC<ObjectInspectorProps> = ({ 
  objects, 
  navi, 
  selectedId, 
  onSelect, 
  onHover 
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('dist-asc');
  const [searchQuery, setSearchQuery] = useState('');

  const getDist = (obj: MOTObject) => {
    const avgX = obj.vertex_points.reduce((a, b) => a + b[0], 0) / (obj.vertex_points.length || 1);
    const avgY = obj.vertex_points.reduce((a, b) => a + b[1], 0) / (obj.vertex_points.length || 1);
    return Math.sqrt(Math.pow(avgX - navi.east, 2) + Math.pow(avgY - navi.north, 2));
  };

  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects;
    const q = searchQuery.toLowerCase();
    return objects.filter(obj => 
      obj.id.toString().includes(q) || 
      (KIND_LABELS[obj.kind] || '').toLowerCase().includes(q)
    );
  }, [objects, searchQuery]);

  const { movingObjects, stationaryObjects } = useMemo(() => {
    const list = [...filteredObjects];
    const sorted = (() => {
      switch (sortMode) {
        case 'dist-asc': return list.sort((a, b) => getDist(a) - getDist(b));
        case 'dist-desc': return list.sort((a, b) => getDist(b) - getDist(a));
        case 'id-asc': return list.sort((a, b) => a.id - b.id);
        case 'id-desc': return list.sort((a, b) => b.id - a.id);
        default: return list;
      }
    })();

    return {
      movingObjects: sorted.filter(obj => obj.vel > 0),
      stationaryObjects: sorted.filter(obj => obj.vel <= 0)
    };
  }, [filteredObjects, sortMode, navi]);

  const renderCard = (obj: MOTObject) => {
    const isSelected = selectedId === obj.id;
    const dist = getDist(obj);
    const displayVel = obj.vel <= 0 ? 0 : Math.round(obj.vel);
    const dims = getObjectDimensions(obj);
    
    return (
      <div 
        key={obj.id} 
        className={`p-4 transition-all cursor-pointer border-l-4 rounded-r-2xl mb-3 shadow-sm ${isSelected ? 'bg-blue-600/30 border-blue-500 ring-1 ring-blue-500/50 shadow-blue-900/20' : 'bg-slate-800/40 hover:bg-slate-800/80 border-transparent hover:shadow-lg'}`}
        onMouseEnter={() => onHover(obj.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(isSelected ? null : obj.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-mono font-black ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>ID: {obj.id}</span>
          <span 
            className="text-[10px] px-2 py-0.5 rounded-lg uppercase font-black border border-current bg-current/10"
            style={{ color: KIND_COLORS[obj.kind] || '#9ca3af' }}
          >
            {KIND_LABELS[obj.kind] || 'OBJ'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 font-bold uppercase tracking-tighter text-[9px]">Speed</span>
            <span className="text-slate-100 font-mono font-bold text-sm">{displayVel} <span className="text-[10px] text-slate-500 font-normal">KM/H</span></span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-slate-500 font-bold uppercase tracking-tighter text-[9px]">Distance</span>
            <span className="text-blue-400 font-mono font-bold text-sm">{dist.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">M</span></span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 opacity-50">
               <Compass size={8} className="text-amber-500" />
               <span className="text-[8px] font-black text-slate-500 uppercase">Theta</span>
            </div>
            <span className="text-[10px] font-mono text-slate-300">{(obj.theta / 1000).toFixed(2)} rad</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <div className="flex items-center gap-1 justify-end opacity-50">
               <span className="text-[8px] font-black text-slate-500 uppercase">Size (LWH)</span>
               <Box size={8} className="text-green-500" />
            </div>
            <span className="text-[10px] font-mono text-slate-300">
              {dims.length.toFixed(1)}×{dims.width.toFixed(1)}×{dims.height.toFixed(1)}m
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent border-b border-white/5">
      <div className="p-6 border-b border-white/5 bg-transparent sticky top-0 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            Active Trackers
            <span className="ml-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px]">{filteredObjects.length}</span>
          </h2>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Filter by ID or Type..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setSortMode('dist-asc')} className={`p-2 rounded-xl flex-1 flex justify-center transition-all ${sortMode === 'dist-asc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'}`} title="Sort by Distance (Asc)"><LocateFixed size={16} /></button>
          <button onClick={() => setSortMode('dist-desc')} className={`p-2 rounded-xl flex-1 flex justify-center transition-all ${sortMode === 'dist-desc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'}`} title="Sort by Distance (Desc)"><Navigation size={16} /></button>
          <button onClick={() => setSortMode('id-asc')} className={`p-2 rounded-xl flex-1 flex justify-center transition-all ${sortMode === 'id-asc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'}`} title="Sort by ID (Asc)"><ArrowUpAZ size={16} /></button>
          <button onClick={() => setSortMode('id-desc')} className={`p-2 rounded-xl flex-1 flex justify-center transition-all ${sortMode === 'id-desc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'}`} title="Sort by ID (Desc)"><ArrowDownAZ size={16} /></button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden divide-x divide-white/5">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-yellow-500/5 flex items-center justify-center gap-2">
            <Zap size={14} className="text-yellow-500" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Moving ({movingObjects.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {movingObjects.length > 0 ? movingObjects.map(renderCard) : (
              <div className="h-20 flex items-center justify-center text-[10px] text-slate-600 font-black uppercase italic">
                {searchQuery ? 'No match' : 'No activity'}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-blue-500/5 flex items-center justify-center gap-2">
            <PauseCircle size={14} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Static ({stationaryObjects.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {stationaryObjects.length > 0 ? stationaryObjects.map(renderCard) : (
              <div className="h-20 flex items-center justify-center text-[10px] text-slate-600 font-black uppercase italic">
                {searchQuery ? 'No match' : 'Empty'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectInspector;
