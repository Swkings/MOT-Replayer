
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Activity, Trash2, ChevronRight, AlertCircle, Clock, Zap, History, Wifi, Database, MoreVertical, Edit3, Copy } from 'lucide-react';
import { MOTInstance, ConnectionConfig, SourceType } from '../types';
import ConnectionDialog from './ConnectionDialog';

interface LandingPageProps {
  instances: MOTInstance[];
  isLoading: boolean;
  error: string | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadInstance: (inst: MOTInstance) => void;
  onDeleteInstance: (id: string, e: React.MouseEvent) => void;
  onStreamConnect: (type: SourceType, config: ConnectionConfig, name: string, id?: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  instances, isLoading, error, onFileUpload, onLoadInstance, onDeleteInstance, onStreamConnect
}) => {
  const [showStreamDialog, setShowStreamDialog] = useState(false);
  const [editingInstance, setEditingInstance] = useState<MOTInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, instance: MOTInstance } | null>(null);

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
      alert('Configuration copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-8 md:p-12 text-slate-100 font-sans overflow-y-auto">
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
            onStreamConnect(type, config, name, editingInstance?.id);
            setShowStreamDialog(false);
            setEditingInstance(null);
          }}
        />
      )}

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
            onClick={(e) => { onDeleteInstance(contextMenu.instance.id, e as any); setContextMenu(null); }}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-colors"
          >
            <Trash2 size={14} /> Delete Entry
          </button>
        </div>
      )}

      <div className="max-w-5xl w-full space-y-12 animate-in fade-in duration-700">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-2xl">
            <Zap size={40} className="fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
              MOT REPLAYER PRO
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
                <input type="file" className="hidden" accept=".log,.txt,.json" onChange={onFileUpload} />
              </label>

              <button 
                onClick={() => { setEditingInstance(null); setShowStreamDialog(true); }}
                className="group relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-[2.5rem] cursor-pointer hover:bg-red-600/5 hover:border-red-500/30 transition-all duration-500"
              >
                <Wifi className="w-8 h-8 text-slate-600 group-hover:text-red-400 mb-3 transition-transform group-hover:-translate-y-1" />
                <div className="text-center px-6">
                  <p className="text-base font-bold text-slate-200">Real-time Stream</p>
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
                <Clock size={16} /> Initializing Engine...
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <History size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Instance Library</span>
              <span className="text-[9px] text-slate-600 font-bold">(Right-click to manage)</span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {instances.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center border border-slate-800/50 rounded-3xl p-8 text-slate-600 italic">
                  <p className="text-[11px] font-bold uppercase">No history found</p>
                </div>
              ) : (
                instances.map(inst => (
                  <div 
                    key={inst.id} 
                    onContextMenu={(e) => handleContextMenu(e, inst)}
                    onClick={() => onLoadInstance(inst)}
                    className="group relative p-5 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-slate-800/50 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center transition-colors ${inst.sourceType !== 'LOG' ? 'text-red-400 group-hover:bg-red-500/10' : 'text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10'}`}>
                        {inst.sourceType === 'LOG' ? <Activity size={20} /> : <Wifi size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-slate-200">{inst.name}</p>
                          {inst.sourceType !== 'LOG' && (
                            <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                              {inst.connectionConfig?.protocol?.replace('://', '') || 'LIVE'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-tighter truncate max-w-[200px]">
                          {inst.sourceType === 'LOG' ? `${inst.frameCount} Frames` : `${inst.connectionConfig?.url}:${inst.connectionConfig?.port}`} • {new Date(inst.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, inst); }}
                        className="p-3 text-slate-600 hover:text-white transition-all rounded-xl hover:bg-white/5"
                      >
                        <MoreVertical size={16} />
                      </button>
                      <ChevronRight size={20} className="text-slate-800 group-hover:text-blue-500 transition-colors mr-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
