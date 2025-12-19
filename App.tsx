
import { FastForward, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Legend from './components/Legend';
import PlaybackCanvas, { PlaybackCanvasHandle } from './components/PlaybackCanvas';
import LandingPage from './components/LandingPage';
import PlaybackControls from './components/PlaybackControls';
import TelemetryPanel from './components/TelemetryPanel';
import AppSidebar from './components/AppSidebar';
import { LogParser } from './services/LogParser';
import { StorageService } from './services/StorageService';
import { streamService } from './services/StreamService';
import { MOTFrame, MOTInstance, SourceType, ConnectionConfig } from './types';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [frames, setFrames] = useState<MOTFrame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [instances, setInstances] = useState<MOTInstance[]>([]);
  const [instanceName, setInstanceName] = useState('');
  const [jumpNotice, setJumpNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [latestRawData, setLatestRawData] = useState<string>('');
  const [streamError, setStreamError] = useState<string | null>(null);
  
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startDataTimeRef = useRef<number>(0);
  const framesRef = useRef<MOTFrame[]>([]);
  const currentIndexRef = useRef<number>(0);
  const canvasRef = useRef<PlaybackCanvasHandle>(null);

  useEffect(() => { loadInstances(); }, []);
  useEffect(() => { framesRef.current = frames; }, [frames]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        setIsPlaying(false);
        console.debug('[App] Auto-paused due to visibility change');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying]);

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (isPlaying && frames.length > 0 && !isLive) {
      startDataTimeRef.current = frames[currentIndex].timestamp;
      startTimeRef.current = performance.now();
    }
  }, [playbackSpeed, isPlaying, isLive]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const loadInstances = async () => {
    try {
      const all = await StorageService.getAllInstances();
      setInstances(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) { console.error("Failed to load instances:", e); }
  };

  const saveCurrentInstance = async (targetFrames: MOTFrame[], targetName: string, type: SourceType = 'LOG', config?: ConnectionConfig, existingId?: string) => {
    if (type === 'LOG' && targetFrames.length === 0) return;
    
    let finalId = existingId;
    if (type !== 'LOG' && !finalId) {
       const existing = instances.find(inst => 
         inst.sourceType === type && 
         inst.connectionConfig?.url === config?.url &&
         inst.connectionConfig?.topic === config?.topic &&
         inst.name === targetName
       );
       if (existing) finalId = existing.id;
    }

    const instance: MOTInstance = {
      id: finalId || generateId(), 
      name: targetName || `Session ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(), 
      frameCount: targetFrames.length, 
      frames: type === 'LOG' ? targetFrames : [], 
      vin: targetFrames[0]?.vin || 'N/A',
      sourceType: type,
      connectionConfig: config
    };
    
    try {
      await StorageService.saveInstance(instance);
      await loadInstances();
      return instance.id;
    } catch (e) {
      console.error("Failed to save instance:", e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = LogParser.parse(e.target?.result as string);
        if (parsed.length === 0) { setError("No valid data found in file."); } 
        else {
          const name = file.name.split('.')[0];
          setInstanceName(name); 
          setFrames(parsed); 
          setCurrentIndex(0); 
          currentIndexRef.current = 0; 
          setIsPlaying(false); 
          setIsLive(false);
          setLatestRawData('');
          await saveCurrentInstance(parsed, name, 'LOG');
        }
      } catch (err) { setError("Import failed. Ensure log format is correct."); } finally { setIsLoading(false); }
    };
    reader.onerror = () => { setError("Failed to read file."); setIsLoading(false); };
    reader.readAsText(file);
  };

  const handleStreamConnect = async (type: SourceType, config: ConnectionConfig, name: string, id?: string) => {
    setIsLive(true);
    setStreamError(null);
    setInstanceName(name);
    setFrames([]);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setLatestRawData('');
    
    streamService.connect(type, config, 
      (frame, raw) => {
        setLatestRawData(raw);
        if (frame) {
          setFrames(prev => {
            const next = [...prev, frame];
            return next.slice(-2000);
          });
          setIsPlaying(true);
        }
      },
      (err) => {
        setStreamError(err);
      }
    );
    
    await saveCurrentInstance([], name, type, config, id);
  };

  const deleteInstance = async (id: string, e: React.MouseEvent) => { 
    e.stopPropagation(); 
    try {
      await StorageService.deleteInstance(id); 
      await loadInstances();
    } catch (err) {
      console.error("Failed to delete instance:", err);
    }
  };

  const loadInstance = (inst: MOTInstance) => { 
    streamService.disconnect();
    setStreamError(null);
    setLatestRawData('');
    if (inst.sourceType === 'LOG') {
      setFrames(inst.frames); 
      setCurrentIndex(0); 
      currentIndexRef.current = 0; 
      setIsPlaying(false); 
      setIsLive(false);
    } else {
      handleStreamConnect(inst.sourceType, inst.connectionConfig!, inst.name, inst.id);
    }
    setInstanceName(inst.name); 
  };

  const togglePlayback = () => {
    if (frames.length === 0 || isLive) return;
    if (!isPlaying) {
      startDataTimeRef.current = frames[currentIndex].timestamp;
      startTimeRef.current = performance.now();
      if (currentIndex >= frames.length - 1) { 
        setCurrentIndex(0); 
        currentIndexRef.current = 0; 
        startDataTimeRef.current = frames[0].timestamp; 
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleHome = () => {
    streamService.disconnect();
    setIsPlaying(false);
    setIsLive(false);
    setFrames([]);
    setStreamError(null);
    setLatestRawData('');
    setSelectedId(null);
    setHoveredId(null);
  };

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    
    const tick = (now: number) => {
      if (isLive) {
        const lastIdx = framesRef.current.length - 1;
        if (lastIdx !== currentIndexRef.current && lastIdx >= 0) {
          setCurrentIndex(lastIdx);
          currentIndexRef.current = lastIdx;
        }
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsedWall = (now - startTimeRef.current) / 1000;
      const targetDataTime = startDataTimeRef.current + (elapsedWall * playbackSpeed);
      let idx = currentIndexRef.current;
      
      if (idx < framesRef.current.length - 1) {
        const gap = framesRef.current[idx + 1].timestamp - framesRef.current[idx].timestamp;
        const jumpThreshold = 1.5;
        
        if (gap > jumpThreshold && targetDataTime > framesRef.current[idx].timestamp + (jumpThreshold / playbackSpeed)) {
           idx = idx + 1;
           setCurrentIndex(idx);
           currentIndexRef.current = idx;
           startDataTimeRef.current = framesRef.current[idx].timestamp;
           startTimeRef.current = now;
           setJumpNotice(`Skipped ${gap.toFixed(1)}s gap`); 
           setTimeout(() => setJumpNotice(null), 2500);
           rafIdRef.current = requestAnimationFrame(tick);
           return;
        }
      }

      while (idx < framesRef.current.length - 1 && framesRef.current[idx + 1].timestamp <= targetDataTime) { 
        idx++; 
      }
      
      if (idx !== currentIndexRef.current) { 
        setCurrentIndex(idx); 
        currentIndexRef.current = idx; 
      }
      
      if (idx >= framesRef.current.length - 1) { 
        setIsPlaying(false); 
        return; 
      }
      
      rafIdRef.current = requestAnimationFrame(tick);
    };
    
    rafIdRef.current = requestAnimationFrame(tick);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [isPlaying, playbackSpeed, frames.length, isLive]);

  if (frames.length === 0 && !isLive) {
    return <LandingPage 
      instances={instances} isLoading={isLoading} error={error} 
      onFileUpload={handleFileUpload} onLoadInstance={loadInstance} 
      onDeleteInstance={deleteInstance} onStreamConnect={handleStreamConnect}
    />;
  }

  const currentFrame: MOTFrame = frames[currentIndex] || { 
    timestamp: 0, 
    navi: { 
      east: 0, north: 0, height: 0, theta: 0, alpha: 0, beta: 0, vel: 0, yaw_angular_speed: 0, ts: 0 
    }, 
    objs: [] 
  };

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {!isFullScreen && (
        <AppSidebar 
          instanceName={instanceName} currentFrame={currentFrame} selectedId={selectedId} hoveredId={hoveredId}
          latestRaw={isLive ? latestRawData : (currentFrame.raw || '')}
          onHome={handleHome} onSave={() => saveCurrentInstance(frames, instanceName)} 
          onReset={() => { if(!isLive) { setCurrentIndex(0); currentIndexRef.current = 0; setIsPlaying(false); } }}
          onSelectObject={setSelectedId} onHoverObject={setHoveredId}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col relative h-full bg-slate-950">
        <div className="flex-1 relative overflow-hidden">
          <PlaybackCanvas 
            ref={canvasRef} 
            frame={currentFrame} 
            isFollowing={isFollowing} 
            selectedId={selectedId} 
            hoveredId={hoveredId} 
            onObjectClick={setSelectedId} 
            onObjectHover={setHoveredId} 
          />
          
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 pointer-events-none">
            <div className="pointer-events-auto">
              <Legend />
            </div>
            {jumpNotice && <div className="bg-blue-600/90 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-left duration-300 backdrop-blur shadow-lg shadow-blue-600/20"><FastForward size={14} />{jumpNotice}</div>}
            
            {streamError && (
              <div className="bg-red-600/90 text-white text-[10px] font-black uppercase px-4 py-3 rounded-xl flex flex-col gap-1 animate-in fade-in slide-in-from-left duration-300 backdrop-blur shadow-lg shadow-red-600/20 border border-white/20">
                <div className="flex items-center gap-2"><AlertCircle size={14} /> Link Down</div>
                <div className="text-white/80 font-mono normal-case text-[9px] truncate max-w-[200px]">{streamError}</div>
              </div>
            )}
          </div>

          <TelemetryPanel 
            speed={currentFrame.navi.vel} 
            yawRate={currentFrame.navi.yaw_angular_speed}
            isFollowing={isFollowing} 
            isFullScreen={isFullScreen}
            isLive={isLive}
            onToggleFollow={() => setIsFollowing(!isFollowing)} 
            onToggleFullScreen={toggleFullScreen}
            onZoomIn={() => canvasRef.current?.zoomIn()} 
            onZoomOut={() => canvasRef.current?.zoomOut()} 
            onResetCamera={() => canvasRef.current?.resetCamera()} 
          />
        </div>
        {!isLive ? (
          <PlaybackControls 
            currentIndex={currentIndex} frameCount={frames.length} isPlaying={isPlaying} timestamp={currentFrame.timestamp} playbackSpeed={playbackSpeed}
            onSeek={(idx) => { setCurrentIndex(idx); currentIndexRef.current = idx; if (isPlaying) { startDataTimeRef.current = frames[idx].timestamp; startTimeRef.current = performance.now(); } }}
            onTogglePlayback={togglePlayback} onSpeedChange={setPlaybackSpeed}
            onStep={(dir) => { const next = Math.max(0, Math.min(frames.length - 1, currentIndex + dir)); setCurrentIndex(next); currentIndexRef.current = next; setIsPlaying(false); }}
          />
        ) : (
          <div className="h-24 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-40">
            <div className="flex items-center gap-6">
               <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Stream Buffer</span>
                 <span className="text-sm font-mono font-bold text-white tracking-tight">{frames.length} frames ingested</span>
               </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Live Reconstruction Clock</span>
               <span className="text-lg font-mono font-bold text-red-500 tracking-tight">
                 {currentFrame.timestamp ? new Date(currentFrame.timestamp * 1000).toLocaleTimeString() : '--:--:--'}
               </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
