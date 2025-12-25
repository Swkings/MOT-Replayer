
import React, { useState, useEffect } from 'react';
import { Upload, Activity, Trash2, ChevronRight, AlertCircle, Clock, Zap, History, Wifi, Database, MoreVertical, Edit3, Copy, CheckCircle2, Play, LayoutTemplate, Columns, Grid } from 'lucide-react';
import { MOTInstance, ConnectionConfig, SourceType } from '../types';
import ConnectionDialog from './ConnectionDialog';

interface LandingPageProps {
  instances: MOTInstance[];
  isLoading: boolean;
  error: string | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLaunch: (instances: MOTInstance[]) => void;
  onDeleteInstance: (id: string, e: React.MouseEvent) => void;
  onStreamSave: (type: SourceType, config: ConnectionConfig, name: string, id?: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  instances, isLoading, error, onFileUpload, onLaunch, onDeleteInstance, onStreamSave
}) => {
  const [showStreamDialog, setShowStreamDialog] = useState(false);
  const [editingInstance, setEditingInstance] = useState<MOTInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, instance: MOTInstance } | null>(null);
  
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, inst: MOTInstance) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, instance: inst });
  };

  const handleEdit = (inst: MOTInstance) => {
    setEditingInstance(inst);
    setShowStreamDialog(true);
  };

  const handleCopyConfig = (inst: MOTInstance) => {
    if (inst.connectionConfig) {
      const configStr = JSON.stringify(inst.connectionConfig, null, 2);
      navigator.clipboard.writeText(configStr);
    }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size >= 4) return; // Max 4 for grid
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleLaunchSelected = () => {
    const selectedInstances = instances.filter(i => selectedIds.has(i.id));
    onLaunch(selectedInstances);
    setSelectedIds(new Set());
  };

  const getLayoutIcon = (count: number) => {
    if (count === 1) return <LayoutTemplate size={16} />;
    if (count === 2) return <Columns size={16} />;
    return <Grid size={16} />;
  };

  const getLayoutLabel = (count: number) => {
    if (count === 1) return 'Single View';
    if (count === 2) return 'Split Compare';
    return 'Grid View';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-8 md:p-12 text-slate-100 font-sans overflow-y-auto relative">
      {showStreamDialog && (
        <ConnectionDialog 
          initialData={editingInstance ? { 
            type: editingInstance.sourceType, 
            config: editingInstance.connectionConfig!, 
            name: editingInstance.name 
          } : undefined}
          onClose={() => {
            setShowStreamDialog(false);
            setEditingInstance(null);
          }} 
          onConnect={(type, config, name) => {
            onStreamSave(type, config, name, editingInstance?.id);
            setShowStreamDialog(false);
            setEditingInstance(null);
          }}
        />
      )}

      {/* Floating Action Bar for Multi-Selection */}
      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="bg-blue-600/90 backdrop-blur-xl border border-white/20 p-2 pr-3 rounded-2xl shadow-2xl flex items-center gap-4">
          <div className="bg-slate-900/40 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-black text-white">{selectedIds.size}</span>
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wide">Selected</span>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <button 
            onClick={handleLaunchSelected}
            className="flex items-center gap-3 px-4 py-2 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-colors shadow-lg font-bold text-sm uppercase tracking-wide"
          >
            {getLayoutIcon(selectedIds.size)}
            Launch {getLayoutLabel(selectedIds.size)}
            <Play size={16} className="fill-current" />
          </button>
          <button 
            onClick={() => setSelectedIds(new Set())}
            className="p-2 hover:bg-white/10 rounded-lg text-blue-100 transition-colors"
            title="Clear Selection"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {contextMenu && (
        <div 
          className="fixed z-[200] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[160px] animate-in fade-in zoom-in duration-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.instance.sourceType !== 'LOG' && (
            <>
              <button 
                onClick={() => handleEdit(contextMenu.instance)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Edit3 size={14} /> Edit Config
              </button>
              <button 
                onClick={() => handleCopyConfig(contextMenu.instance)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Copy size={14} /> Copy Config
              </button>
              <div className="h-px bg-white/5 my-1 mx-2" />
            </>
          )}
          <button 
            onClick={(e) => { onDeleteInstance(contextMenu.instance.id, e as any); setContextMenu(null); setSelectedIds(prev => { const n = new Set(prev); n.delete(contextMenu!.instance.id); return n; }); }}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-colors"
          >
            <Trash2 size={14} /> Delete Entry
          </button>
        </div>
      )}

      <div className="max-w-6xl w-full space-y-12 animate-in fade-in duration-700">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-2xl">
            <Zap size={40} className="fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
              MOT REPLAYER
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Spatial Intelligence Reconstruction</p>
              <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-500/20">MOT-6 Supported</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Upload size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Import Sources</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <label className="group relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-[2.5rem] cursor-pointer hover:bg-blue-600/5 hover:border-blue-500/30 transition-all duration-500">
                <Database className="w-8 h-8 text-slate-600 group-hover:text-blue-400 mb-3 transition-transform group-hover:-translate-y-1" />
                <div className="text-center px-6">
                  <p className="text-base font-bold text-slate-200">Upload Static Log</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest">Select .log / .json / .txt</p>
                </div>
                <input type="file" className="hidden" accept=".log,.txt,.json" onChange={onFileUpload} value="" />
              </label>

              <button 
                onClick={() => { setEditingInstance(null); setShowStreamDialog(true); }}
                className="group relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-[2.5rem] cursor-pointer hover:bg-red-600/5 hover:border-red-500/30 transition-all duration-500"
              >
                <Wifi className="w-8 h-8 text-slate-600 group-hover:text-red-400 mb-3 transition-transform group-hover:-translate-y-1" />
                <div className="text-center px-6">
                  <p className="text-base font-bold text-slate-200">Configure Stream</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest">MQTT / WebSocket</p>
                </div>
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase flex items-center gap-3">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center justify-center gap-3 text-blue-500 font-mono text-xs animate-pulse tracking-widest uppercase">
                <Clock size={16} /> Importing Data...
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <History size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Instance Library</span>
              </div>
              <span className="text-[9px] text-slate-600 font-bold">
                {instances.length} Found • Select up to 4 to compare
              </span>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2 pb-20">
              {instances.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center border border-slate-800/50 rounded-3xl p-8 text-slate-600 italic">
                  <p className="text-[11px] font-bold uppercase">No history found</p>
                </div>
              ) : (
                instances.map(inst => {
                  const isSelected = selectedIds.has(inst.id);
                  return (
                    <div 
                      key={inst.id} 
                      onContextMenu={(e) => handleContextMenu(e, inst)}
                      onClick={() => onLaunch([inst])}
                      className={`group relative p-4 border rounded-3xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-600/10 border-blue-500/50' 
                          : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/50 hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={(e) => toggleSelection(e, inst.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                              : 'bg-slate-800 border-white/5 text-slate-600 hover:border-white/20'
                          }`}
                        >
                           {isSelected ? <CheckCircle2 size={18} /> : (inst.sourceType === 'LOG' ? <Activity size={18} /> : <Wifi size={18} />)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-blue-200' : 'text-slate-200'}`}>{inst.name}</p>
                            {inst.sourceType !== 'LOG' && (
                              <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                {inst.connectionConfig?.protocol?.replace('://', '') || 'LIVE'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-tighter truncate max-w-[200px]">
                            {inst.sourceType === 'LOG' ? `${inst.frameCount} Frames` : `${inst.connectionConfig?.url}:${inst.connectionConfig?.port}`} • {new Date(inst.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, inst); }}
                          className="p-2 text-slate-600 hover:text-white transition-all rounded-lg hover:bg-white/5"
                        >
                          <MoreVertical size={16} />
                        </button>
                        <div className="p-2">
                           <ChevronRight size={18} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
