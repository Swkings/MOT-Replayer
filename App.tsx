
import { FastForward, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Legend from './components/Legend';
import PlaybackStats from './components/PlaybackStats';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startDataTimeRef = useRef<number>(0);
  const framesRef = useRef<MOTFrame[]>([]);
  const currentIndexRef = useRef<number>(0);
  const canvasRef = useRef<PlaybackCanvasHandle>(null);

  useEffect(() => { loadInstances(); }, []);
  useEffect(() => { framesRef.current = frames; }, [frames]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const togglePlayback = useCallback(() => {
    if (framesRef.current.length === 0 || isLive) return;
    setIsPlaying(prev => {
      const next = !prev;
      if (next) {
        startDataTimeRef.current = framesRef.current[currentIndexRef.current].timestamp;
        startTimeRef.current = performance.now();
        if (currentIndexRef.current >= framesRef.current.length - 1) { 
          setCurrentIndex(0); 
          currentIndexRef.current = 0; 
          startDataTimeRef.current = framesRef.current[0].timestamp; 
        }
      }
      return next;
    });
  }, [isLive]);

  // Global key listener for playback control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Prevent trigger if user is typing in an input
        const activeElement = document.activeElement;
        const isInput = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
        if (!isInput) {
          e.preventDefault();
          togglePlayback();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) setIsPlaying(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying]);

  useEffect(() => {
    const handleFsChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);
      if (isFS) setIsSidebarCollapsed(true);
      else setIsSidebarCollapsed(false);
    };
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
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
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
       const existing = instances.find(inst => inst.sourceType === type && inst.connectionConfig?.url === config?.url && inst.connectionConfig?.topic === config?.topic && inst.name === targetName);
       if (existing) finalId = existing.id;
    }
    const instance: MOTInstance = { id: finalId || generateId(), name: targetName || `Session ${new Date().toLocaleTimeString()}`, createdAt: Date.now(), frameCount: targetFrames.length, frames: type === 'LOG' ? targetFrames : [], vin: targetFrames[0]?.vin || 'N/A', sourceType: type, connectionConfig: config };
    try { await StorageService.saveInstance(instance); await loadInstances(); return instance.id; } catch (e) { console.error("Failed to save instance:", e); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = LogParser.parse(e.target?.result as string);
        if (parsed.length === 0) setError("No valid data found.");
        else {
          const name = file.name.split('.')[0];
          setInstanceName(name); setFrames(parsed); setCurrentIndex(0); currentIndexRef.current = 0; setIsPlaying(false); setIsLive(false); setLatestRawData('');
          await saveCurrentInstance(parsed, name, 'LOG');
        }
      } catch (err) { setError("Import failed."); } finally { setIsLoading(false); }
    };
    reader.readAsText(file);
  };

  const handleStreamConnect = async (type: SourceType, config: ConnectionConfig, name: string, id?: string) => {
    setIsLive(true); setStreamError(null); setInstanceName(name); setFrames([]); setCurrentIndex(0); currentIndexRef.current = 0; setLatestRawData('');
    streamService.connect(type, config, (frame, raw) => {
        setLatestRawData(raw);
        if (frame) {
          setFrames(prev => {
            const next = [...prev, frame];
            return next.slice(-2000);
          });
          setIsPlaying(true);
        }
      },
      (err) => setStreamError(err)
    );
    await saveCurrentInstance([], name, type, config, id);
  };

  const deleteInstance = async (id: string, e: React.MouseEvent) => { 
    e.stopPropagation(); 
    try { await StorageService.deleteInstance(id); await loadInstances(); } catch (err) { console.error("Failed to delete:", err); }
  };

  const loadInstance = (inst: MOTInstance) => { 
    streamService.disconnect();
    setStreamError(null); setLatestRawData('');
    if (inst.sourceType === 'LOG') {
      setFrames(inst.frames); setCurrentIndex(0); currentIndexRef.current = 0; setIsPlaying(false); setIsLive(false);
    } else {
      handleStreamConnect(inst.sourceType, inst.connectionConfig!, inst.name, inst.id);
    }
    setInstanceName(inst.name); 
  };

  const handleHome = () => {
    streamService.disconnect(); setIsPlaying(false); setIsLive(false); setFrames([]); setStreamError(null); setLatestRawData(''); setSelectedId(null); setHoveredId(null);
  };

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const tick = (now: number) => {
      if (isLive) {
        const lastIdx = framesRef.current.length - 1;
        if (lastIdx !== currentIndexRef.current && lastIdx >= 0) { setCurrentIndex(lastIdx); currentIndexRef.current = lastIdx; }
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsedWall = (now - startTimeRef.current) / 1000;
      const targetDataTime = startDataTimeRef.current + (elapsedWall * playbackSpeed);
      let idx = currentIndexRef.current;
      if (idx < framesRef.current.length - 1) {
        const gap = framesRef.current[idx + 1].timestamp - framesRef.current[idx].timestamp;
        if (gap > 1.5 && targetDataTime > framesRef.current[idx].timestamp + (1.5 / playbackSpeed)) {
           idx = idx + 1; setCurrentIndex(idx); currentIndexRef.current = idx; startDataTimeRef.current = framesRef.current[idx].timestamp; startTimeRef.current = now;
           setJumpNotice(`Skipped ${gap.toFixed(1)}s gap`); setTimeout(() => setJumpNotice(null), 2500);
           rafIdRef.current = requestAnimationFrame(tick);
           return;
        }
      }
      while (idx < framesRef.current.length - 1 && framesRef.current[idx + 1].timestamp <= targetDataTime) idx++; 
      if (idx !== currentIndexRef.current) { setCurrentIndex(idx); currentIndexRef.current = idx; }
      if (idx >= framesRef.current.length - 1) { setIsPlaying(false); return; }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [isPlaying, playbackSpeed, frames.length, isLive]);

  if (frames.length === 0 && !isLive) {
    return <LandingPage instances={instances} isLoading={isLoading} error={error} onFileUpload={handleFileUpload} onLoadInstance={loadInstance} onDeleteInstance={deleteInstance} onStreamConnect={handleStreamConnect} />;
  }

  const currentFrame: MOTFrame = frames[currentIndex] || { timestamp: 0, navi: { east: 0, north: 0, height: 0, theta: 0, alpha: 0, beta: 0, vel: 0, yaw_angular_speed: 0, ts: 0 }, objs: [] };

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      <AppSidebar 
        instanceName={instanceName} 
        currentFrame={currentFrame} 
        selectedId={selectedId} 
        hoveredId={hoveredId}
        latestRaw={isLive ? latestRawData : (currentFrame.raw || '')}
        onHome={handleHome} 
        onSave={() => saveCurrentInstance(frames, instanceName)} 
        onReset={() => { if(!isLive) { setCurrentIndex(0); currentIndexRef.current = 0; setIsPlaying(false); } }}
        onSelectObject={setSelectedId} 
        onHoverObject={setHoveredId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className="flex-1 relative flex flex-col bg-slate-950">
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
          <div className="pointer-events-auto">
            <PlaybackStats 
              currentIndex={currentIndex} 
              totalFrames={frames.length} 
              isLive={isLive}
            />
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

        <PlaybackControls 
          currentIndex={currentIndex} 
          frameCount={frames.length} 
          isPlaying={isPlaying} 
          timestamp={currentFrame.timestamp} 
          playbackSpeed={playbackSpeed}
          isLive={isLive}
          onSeek={(idx) => { setCurrentIndex(idx); currentIndexRef.current = idx; if (isPlaying) { startDataTimeRef.current = frames[idx].timestamp; startTimeRef.current = performance.now(); } }}
          onTogglePlayback={togglePlayback} 
          onSpeedChange={setPlaybackSpeed}
          onStep={(dir) => { const next = Math.max(0, Math.min(frames.length - 1, currentIndex + dir)); setCurrentIndex(next); currentIndexRef.current = next; setIsPlaying(false); }}
        />
      </div>
    </div>
  );
};

export default App;
