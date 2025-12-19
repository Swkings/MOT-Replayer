
import { FastForward, AlertCircle, Plus, CheckCircle, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { MOTFrame, MOTInstance, SourceType, ConnectionConfig, LayoutMode, SlotData } from './types';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Default blank frame to avoid crashes
const DEFAULT_FRAME: MOTFrame = { timestamp: 0, navi: { east: 0, north: 0, height: 0, theta: 0, alpha: 0, beta: 0, vel: 0, yaw_angular_speed: 0, ts: 0 }, objs: [] };

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const App: React.FC = () => {
  // --- Multi-Slot State ---
  const [slots, setSlots] = useState<(SlotData | null)[]>([null, null, null, null]);
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('SINGLE');

  // --- Global Playback State ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [uiOpacity, setUiOpacity] = useState(0.95);
  
  // --- Common UI State ---
  const [instances, setInstances] = useState<MOTInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // --- Viewport Interactive State ---
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isNaviSelected, setIsNaviSelected] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [jumpNotice, setJumpNotice] = useState<string | null>(null);

  // --- Refs ---
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startDataTimeRef = useRef<number>(0);
  const currentIndexRef = useRef<number>(0);
  const slotsRef = useRef<(SlotData | null)[]>([]); // To access latest slots in RAF
  
  const canvasRefs = useRef<(PlaybackCanvasHandle | null)[]>([null, null, null, null]);

  useEffect(() => { loadInstances(); }, []);
  useEffect(() => { slotsRef.current = slots; }, [slots]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // --- Helpers ---
  const getFocusedSlot = () => slots[focusedSlotIndex];
  const maxFrames = useMemo(() => {
    return slots.reduce((max, slot) => slot ? Math.max(max, slot.frames.length) : max, 0);
  }, [slots]);
  const isAnyLive = useMemo(() => slots.some(s => s?.isLive), [slots]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Instance Management ---
  const loadInstances = async () => {
    try {
      const all = await StorageService.getAllInstances();
      setInstances(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) { console.error("Failed to load instances:", e); }
  };

  const saveInstance = async (targetFrames: MOTFrame[], targetName: string, type: SourceType = 'LOG', config?: ConnectionConfig, existingId?: string) => {
    if (type === 'LOG' && targetFrames.length === 0) return;
    let finalId = existingId || generateId();
    // Check duplication for non-log
    if (type !== 'LOG' && !existingId) {
       const existing = instances.find(inst => inst.sourceType === type && inst.connectionConfig?.url === config?.url && inst.name === targetName);
       if (existing) finalId = existing.id;
    }
    const instance: MOTInstance = { 
      id: finalId, 
      name: targetName, 
      createdAt: Date.now(), 
      frameCount: targetFrames.length, 
      frames: type === 'LOG' ? targetFrames : [], 
      vin: targetFrames[0]?.vin || 'N/A', 
      sourceType: type, 
      connectionConfig: config 
    };
    try { await StorageService.saveInstance(instance); await loadInstances(); return instance.id; } catch (e) { console.error("Failed to save:", e); }
  };

  // --- Loading Logic ---
  const updateSlot = (index: number, data: SlotData | null) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = data;
      return next;
    });
  };

  const handleLaunchSession = (selectedInstances: MOTInstance[]) => {
    if (selectedInstances.length === 0) return;

    // Reset State
    setIsPlaying(false);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    streamService.disconnect();

    // Determine Layout
    let mode: LayoutMode = 'SINGLE';
    if (selectedInstances.length === 2) mode = 'SPLIT_V';
    else if (selectedInstances.length >= 3) mode = 'GRID';
    setLayoutMode(mode);

    // Populate Slots
    const newSlots = [null, null, null, null] as (SlotData | null)[];
    
    selectedInstances.forEach((inst, idx) => {
       if (idx > 3) return;
       
       if (inst.sourceType === 'LOG') {
         newSlots[idx] = {
           instanceId: inst.id,
           name: inst.name,
           frames: inst.frames,
           isLive: false
         };
       } else {
         // Initialize live slot, actual connection happens inside connect
         newSlots[idx] = {
           instanceId: inst.id,
           name: inst.name,
           frames: [],
           isLive: true,
           streamRaw: ''
         };
         // Trigger connection
         connectStreamToSlot(inst.sourceType, inst.connectionConfig!, idx);
       }
    });

    setSlots(newSlots);
    setFocusedSlotIndex(0);
  };

  const connectStreamToSlot = (type: SourceType, config: ConnectionConfig, slotIndex: number) => {
    streamService.connect(type, config, (frame, raw) => {
        setSlots(prev => {
          const next = [...prev];
          const currentSlot = next[slotIndex];
          if (currentSlot && currentSlot.isLive) {
             const newFrames = [...currentSlot.frames, frame].filter(Boolean) as MOTFrame[];
             next[slotIndex] = { ...currentSlot, frames: newFrames.slice(-2000), streamRaw: raw };
             if(!isPlaying && newFrames.length > 5) setIsPlaying(true);
          }
          return next;
        });
      },
      (err) => {
        setSlots(prev => {
          const next = [...prev];
          if(next[slotIndex]) next[slotIndex]!.streamError = err;
          return next;
        });
      }
    );
  };

  const handleLoadInstanceToSlot = (inst: MOTInstance) => {
     // Single slot update (drag and drop replacement logic)
     if (inst.sourceType === 'LOG') {
       updateSlot(focusedSlotIndex, {
         instanceId: inst.id,
         name: inst.name,
         frames: inst.frames,
         isLive: false
       });
     } else {
       updateSlot(focusedSlotIndex, {
          instanceId: inst.id,
          name: inst.name,
          frames: [],
          isLive: true,
          streamRaw: ''
       });
       connectStreamToSlot(inst.sourceType, inst.connectionConfig!, focusedSlotIndex);
     }
  };

  // --- Import Logic (Dashboard Only) ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = LogParser.parse(e.target?.result as string);
        if (parsed.length === 0) setError("No valid data found in file.");
        else {
          const name = file.name.split('.')[0];
          await saveInstance(parsed, name, 'LOG');
          showToast(`Successfully imported "${name}"`);
        }
      } catch (err) { setError("Import failed. Check file format."); } 
      finally { setIsLoading(false); }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleStreamConfigSave = async (type: SourceType, config: ConnectionConfig, name: string, id?: string) => {
    await saveInstance([], name, type, config, id);
    showToast(`Stream configuration "${name}" saved`);
  };

  // --- Playback Logic ---
  const togglePlayback = useCallback(() => {
    if (maxFrames === 0 || isAnyLive) return;
    setIsPlaying(prev => {
      const next = !prev;
      if (next) {
        const anchorSlot = slotsRef.current.find(s => s !== null);
        const anchorFrame = anchorSlot?.frames[currentIndexRef.current];
        startDataTimeRef.current = anchorFrame ? anchorFrame.timestamp : 0;
        startTimeRef.current = performance.now();
        
        if (currentIndexRef.current >= maxFrames - 1) { 
           setCurrentIndex(0); currentIndexRef.current = 0; 
           const firstFrame = anchorSlot?.frames[0];
           startDataTimeRef.current = firstFrame ? firstFrame.timestamp : 0;
        }
      }
      return next;
    });
  }, [maxFrames, isAnyLive]);

  useEffect(() => {
    if (isPlaying && !isAnyLive) {
       const anchorSlot = slots.find(s => s !== null);
       if(anchorSlot && anchorSlot.frames[currentIndex]) {
          startDataTimeRef.current = anchorSlot.frames[currentIndex].timestamp;
          startTimeRef.current = performance.now();
       }
    }
  }, [playbackSpeed, isPlaying, isAnyLive]); 

  // The Game Loop
  useEffect(() => {
    if (!isPlaying || maxFrames === 0) return;

    const tick = (now: number) => {
      if (isAnyLive) {
        const target = maxFrames - 1;
        if (target !== currentIndexRef.current && target >= 0) {
          setCurrentIndex(target); currentIndexRef.current = target;
        }
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsedWall = (now - startTimeRef.current) / 1000;
      const targetDataTime = startDataTimeRef.current + (elapsedWall * playbackSpeed);
      
      const primarySlot = slotsRef.current.find(s => s !== null && s.frames.length > 0);
      
      if (!primarySlot) { setIsPlaying(false); return; }

      let idx = currentIndexRef.current;
      const frames = primarySlot.frames;

      // Skip logic
      if (idx < frames.length - 1) {
         const gap = frames[idx+1].timestamp - frames[idx].timestamp;
         if (gap > 1.5 && targetDataTime > frames[idx].timestamp + (1.5 / playbackSpeed)) {
            idx++; 
            setCurrentIndex(idx); currentIndexRef.current = idx;
            startDataTimeRef.current = frames[idx].timestamp; startTimeRef.current = now;
            setJumpNotice(`Skipped ${gap.toFixed(1)}s gap`); setTimeout(() => setJumpNotice(null), 2500);
            rafIdRef.current = requestAnimationFrame(tick);
            return;
         }
      }

      while (idx < frames.length - 1 && frames[idx + 1].timestamp <= targetDataTime) {
        idx++;
      }

      if (idx !== currentIndexRef.current) {
        setCurrentIndex(idx); currentIndexRef.current = idx;
      }

      if (idx >= frames.length - 1) {
        if (idx >= maxFrames - 1) setIsPlaying(false);
        else rafIdRef.current = requestAnimationFrame(tick); 
      } else {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [isPlaying, playbackSpeed, maxFrames, isAnyLive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(document.activeElement instanceof HTMLInputElement)) {
        e.preventDefault(); togglePlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback]);

  // --- Layout & Rendering ---
  const handleHome = () => {
    streamService.disconnect(); setIsPlaying(false); 
    setSlots([null, null, null, null]); 
    setFocusedSlotIndex(0);
    setCurrentIndex(0);
    setError(null);
  };

  const getSlotClass = () => {
    switch (layoutMode) {
      case 'SPLIT_V': return 'grid-cols-2 grid-rows-1';
      case 'SPLIT_H': return 'grid-cols-1 grid-rows-2';
      case 'GRID': return 'grid-cols-2 grid-rows-2';
      default: return 'grid-cols-1 grid-rows-1';
    }
  };

  const visibleSlotIndices = useMemo(() => {
    switch(layoutMode) {
      case 'SINGLE': return [0];
      case 'SPLIT_V': return [0, 1];
      case 'SPLIT_H': return [0, 1];
      case 'GRID': return [0, 1, 2, 3];
    }
  }, [layoutMode]);

  const focusedSlot = getFocusedSlot();
  const currentFrameForSidebar = focusedSlot?.frames[Math.min(currentIndex, focusedSlot.frames.length - 1)] || DEFAULT_FRAME;

  // Initial State: Landing Page
  if (slots.every(s => s === null)) {
    return (
      <>
        <LandingPage 
          instances={instances} 
          isLoading={isLoading} 
          error={error} 
          onFileUpload={handleFileUpload} 
          onLaunch={handleLaunchSession} 
          onDeleteInstance={async (id, e) => { e.stopPropagation(); await StorageService.deleteInstance(id); await loadInstances(); }} 
          onStreamSave={handleStreamConfigSave}
        />
        {toast && (
          <div className="fixed top-8 right-8 z-[200] animate-in fade-in slide-in-from-right duration-300">
             <div className={`bg-slate-900 border ${toast.type === 'success' ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'} px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
                {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                <span className="font-bold text-sm">{toast.message}</span>
             </div>
          </div>
        )}
      </>
    );
  }

  // Calculate dynamic offset for HUD elements (Legend, Stats) based on Sidebar state
  // Collapsed: 24 (6rem=96px) + 24px padding = ~120px
  // Expanded: 420px + 24px padding = 444px
  const hudLeftPos = isSidebarCollapsed ? 'calc(6rem + 24px)' : '444px';

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* 1. Map Canvas Layer (Background) */}
      <div className="absolute inset-0 z-0 flex flex-col bg-slate-950">
        <div className={`flex-1 grid gap-1 p-1 bg-slate-950 ${getSlotClass()}`}>
          {visibleSlotIndices.map(index => {
            const slot = slots[index];
            const isActive = index === focusedSlotIndex;
            const frame = slot ? (slot.frames[Math.min(currentIndex, slot.frames.length - 1)] || DEFAULT_FRAME) : DEFAULT_FRAME;
            
            return (
              <div 
                key={index} 
                className={`relative overflow-hidden rounded-xl border-2 transition-all ${isActive ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] z-10' : 'border-white/5 hover:border-white/10'}`}
                onClick={() => setFocusedSlotIndex(index)}
              >
                {slot ? (
                   <PlaybackCanvas 
                      ref={(el) => { canvasRefs.current[index] = el; }}
                      frame={frame} 
                      isFollowing={isFollowing} 
                      selectedId={isActive ? selectedId : null} 
                      hoveredId={isActive ? hoveredId : null}
                      isNaviSelected={isActive ? isNaviSelected : false}
                      onObjectClick={(id) => { if(isActive) { setSelectedId(id); if(id !== null) setIsNaviSelected(false); } }}
                      onObjectHover={(id) => { if(isActive) setHoveredId(id); }}
                      onNaviClick={(sel) => { if(isActive) { setIsNaviSelected(sel); if(sel) setSelectedId(null); } }}
                      onNaviHover={() => {}} 
                   />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 text-slate-600 gap-3">
                     <Plus size={48} className="opacity-20" />
                     <p className="text-xs font-bold uppercase tracking-widest opacity-50">Select to Activate</p>
                  </div>
                )}
                
                {/* Slot Label */}
                <div className="absolute top-2 left-2 z-20 pointer-events-none">
                  <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest backdrop-blur-md ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-500'}`}>
                    View {index + 1} {slot ? `• ${slot.name}` : ''}
                  </div>
                  {slot?.streamError && (
                    <div className="mt-1 px-2 py-1 bg-red-500/90 text-white text-[9px] font-bold rounded-md flex items-center gap-1">
                      <AlertCircle size={10} /> Link Error
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Sidebar Layer (Foreground, Absolute Left) */}
      <div className="absolute top-0 left-0 bottom-0 z-50 h-full pointer-events-none">
         <div className="pointer-events-auto h-full flex">
            <AppSidebar 
              instanceName={focusedSlot?.name || ''} 
              currentFrame={currentFrameForSidebar}
              selectedId={selectedId}
              hoveredId={hoveredId}
              latestRaw={focusedSlot?.streamRaw}
              instances={instances}
              layoutMode={layoutMode}
              slots={slots}
              uiOpacity={uiOpacity}
              setUiOpacity={setUiOpacity}
              onHome={handleHome} 
              onSave={() => saveInstance(focusedSlot?.frames || [], focusedSlot?.name || 'Session')} 
              onExport={() => {
                if(!focusedSlot) return;
                const blob = new Blob([JSON.stringify(focusedSlot.frames, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${focusedSlot.name}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              }}
              onReset={() => { if(!isAnyLive) { setCurrentIndex(0); currentIndexRef.current = 0; setIsPlaying(false); } }}
              onSelectObject={(id) => { setSelectedId(id); if(id !== null) setIsNaviSelected(false); }} 
              onHoverObject={setHoveredId}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onChangeLayout={setLayoutMode}
              onLoadInstanceToSlot={handleLoadInstanceToSlot}
              onDeleteInstance={async (id, e) => { e.stopPropagation(); await StorageService.deleteInstance(id); await loadInstances(); }}
            />
         </div>
      </div>

      {/* 3. Global HUD Overlays (Legend/Stats) - Positioned relative to Sidebar */}
      <div 
        className="absolute top-6 z-30 pointer-events-none hidden md:flex flex-col gap-4 pl-4 pt-4 transition-all duration-500 ease-in-out"
        style={{ left: hudLeftPos }}
      >
        <div className="pointer-events-auto"><Legend opacity={uiOpacity} /></div>
        <div className="pointer-events-auto">
            <PlaybackStats currentIndex={currentIndex} totalFrames={maxFrames} isLive={focusedSlot?.isLive} opacity={uiOpacity} />
        </div>
        {jumpNotice && <div className="bg-blue-600/90 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-left duration-300 backdrop-blur shadow-lg shadow-blue-600/20"><FastForward size={14} />{jumpNotice}</div>}
      </div>

      {/* 4. Telemetry & Controls (Positioned Absolutes) */}
      {/* Note: TelemetryPanel and PlaybackControls already use fixed positioning or absolute positioning that works relative to viewport */}
      <TelemetryPanel 
        speed={currentFrameForSidebar.navi.vel} 
        yawRate={currentFrameForSidebar.navi.yaw_angular_speed}
        isFollowing={isFollowing} 
        isFullScreen={isFullScreen}
        isLive={focusedSlot?.isLive}
        opacity={uiOpacity}
        onToggleFollow={() => setIsFollowing(!isFollowing)} 
        onToggleFullScreen={() => {
          if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen();
          setIsFullScreen(!document.fullscreenElement);
        }}
        onZoomIn={() => canvasRefs.current.forEach(c => c?.zoomIn())} 
        onZoomOut={() => canvasRefs.current.forEach(c => c?.zoomOut())} 
        onResetCamera={() => canvasRefs.current.forEach(c => c?.resetCamera())} 
      />

      <PlaybackControls 
        currentIndex={currentIndex} 
        frameCount={maxFrames} 
        isPlaying={isPlaying} 
        timestamp={currentFrameForSidebar.timestamp} 
        playbackSpeed={playbackSpeed}
        isLive={isAnyLive}
        opacity={uiOpacity}
        onSeek={(idx) => { 
            setCurrentIndex(idx); currentIndexRef.current = idx; 
            if(isPlaying) {
              const anchorSlot = slots.find(s => s !== null && s.frames[idx]);
              if (anchorSlot) {
                startDataTimeRef.current = anchorSlot.frames[idx].timestamp;
                startTimeRef.current = performance.now();
              }
            }
        }}
        onTogglePlayback={togglePlayback} 
        onSpeedChange={setPlaybackSpeed}
        onStep={(dir) => { 
            const next = Math.max(0, Math.min(maxFrames - 1, currentIndex + dir)); 
            setCurrentIndex(next); currentIndexRef.current = next; setIsPlaying(false); 
        }}
      />
    </div>
  );
};

export default App;
