
import React, { useState, useEffect } from 'react';
import { X, Globe, Wifi, Key, Server, Hash, ChevronDown } from 'lucide-react';
import { ConnectionConfig, SourceType } from '../types';

interface ConnectionDialogProps {
  onClose: () => void;
  onConnect: (type: SourceType, config: ConnectionConfig, name: string) => void;
  initialData?: { type: SourceType, config: ConnectionConfig, name: string };
}

const STORAGE_KEY = 'mot_replayer_last_config';

const ConnectionDialog: React.FC<ConnectionDialogProps> = ({ onClose, onConnect, initialData }) => {
  const [type, setType] = useState<SourceType>(initialData?.type || 'MQTT');
  const [name, setName] = useState(initialData?.name || '');
  const [config, setConfig] = useState<ConnectionConfig>(initialData?.config || {
    protocol: 'wss://',
    url: '',
    port: 8084,
    topic: 'mov_objs_hmi'
  });

  useEffect(() => {
    if (!initialData) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setType(parsed.type);
          setConfig(parsed.config);
          setName(parsed.name);
        } catch (e) {}
      } else {
        setConfig(prev => ({ ...prev, url: 'broker.emqx.io', protocol: 'wss://', port: 8084 }));
        setName('Default Stream');
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !config.url) return;

    // Sanitize input: Strip any manually entered protocols from the URL string itself
    const cleanUrl = config.url.trim().replace(/^(ws:\/\/|wss:\/\/|mqtt:\/\/|mqtts:\/\/)/, '');
    const finalConfig = { ...config, url: cleanUrl };

    if (!initialData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, config: finalConfig, name }));
    }
    
    onConnect(type, finalConfig, name);
  };

  const isPageSecure = window.location.protocol === 'https:';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      {/* Increased width from max-w-md to max-w-xl */}
      <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Wifi size={24} />
            </div>
            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">{initialData ? 'Update Stream' : 'New Stream'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="flex p-1 bg-slate-800 rounded-2xl">
            {(['MQTT', 'WEBSOCKET'] as SourceType[]).map(t => (
              <button 
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${type === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                <span className="text-red-500 mr-1">*</span>Session Identity
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  autoFocus
                  className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500 transition-all outline-none"
                  placeholder="Production Fleet A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-8">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  <span className="text-red-500 mr-1">*</span>Host
                </label>
                <div className="flex gap-2">
                  <div className="relative group min-w-[120px]">
                    <select 
                      value={config.protocol}
                      onChange={e => setConfig({...config, protocol: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 pl-4 pr-10 text-[12px] font-black text-blue-400 appearance-none focus:border-blue-500 transition-all outline-none cursor-pointer"
                    >
                      <option value="ws://">ws://</option>
                      <option value="wss://">wss://</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                  </div>
                  <div className="relative flex-1">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500 transition-all outline-none font-mono"
                      placeholder="broker.emqx.io"
                      value={config.url}
                      onChange={e => setConfig({...config, url: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  <span className="text-red-500 mr-1">*</span>Port
                </label>
                <input 
                  className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500 transition-all outline-none font-mono"
                  placeholder="8083"
                  type="number"
                  value={config.port}
                  onChange={e => setConfig({...config, port: parseInt(e.target.value) || undefined})}
                  required
                />
              </div>
            </div>

            {isPageSecure && config.protocol === 'ws://' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                  <AlertCircle size={16} />
                </div>
                <p className="text-[11px] text-amber-300 font-bold uppercase leading-relaxed">
                  HTTPS Warning: Browser security policy may block ws:// (insecure) connections. Consider using wss://.
                </p>
              </div>
            )}

            {type === 'MQTT' && (
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Subscribed Topic</label>
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500 transition-all outline-none font-mono"
                    placeholder="tracking/hmi/objects"
                    value={config.topic}
                    onChange={e => setConfig({...config, topic: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Auth User</label>
                <input 
                  className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500 transition-all outline-none"
                  value={config.username || ''}
                  onChange={e => setConfig({...config, username: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Auth Key</label>
                <div className="relative">
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="password"
                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500 transition-all outline-none"
                    value={config.password || ''}
                    onChange={e => setConfig({...config, password: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-5 rounded-[1.5rem] shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all text-sm"
          >
            {initialData ? 'Update Configuration' : 'Establish Live Tunnel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConnectionDialog;
import { AlertCircle } from 'lucide-react';
