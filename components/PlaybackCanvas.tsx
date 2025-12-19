
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MOTFrame, MOTObject, NaviData } from '../types';
import { KIND_COLORS, KIND_LABELS } from '../constants';
import { Object3DFactory } from './MotObject/Object3D';
import { applyObjectScaling, calculateRelativePosition, getObjectDimensions } from '../functions/spatialUtils';
import { drawObjectLabel } from '../functions/canvasUtils';
import { Box, Compass, MoveDiagonal, Activity, Ruler, Pin, Navigation, MapPin } from 'lucide-react';

export interface PlaybackCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
}

interface PlaybackCanvasProps {
  frame: MOTFrame;
  isFollowing?: boolean;
  selectedId: number | null;
  hoveredId: number | null;
  isNaviSelected?: boolean;
  isNaviHovered?: boolean;
  onObjectClick?: (id: number | null) => void;
  onObjectHover?: (id: number | null) => void;
  onNaviClick?: (selected: boolean) => void;
  onNaviHover?: (hovered: boolean) => void;
}

interface CachedObject {
  group: THREE.Group;
  mesh: THREE.Group;
  labelSprite: THREE.Sprite;
  labelCanvas: HTMLCanvasElement;
  labelCtx: CanvasRenderingContext2D;
  arrow?: THREE.ArrowHelper;
  ring?: THREE.Mesh;
  lastVel: number;
  lastState: 'selected' | 'hovered' | 'normal';
}

const PlaybackCanvas = forwardRef<PlaybackCanvasHandle, PlaybackCanvasProps>(({ 
  frame, 
  isFollowing = true, 
  selectedId, 
  hoveredId,
  isNaviSelected = false,
  isNaviHovered = false,
  onObjectClick, 
  onObjectHover,
  onNaviClick,
  onNaviHover
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const hostGroupRef = useRef<THREE.Group | null>(null);
  const groundGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const objectCacheRef = useRef<Map<number, CachedObject>>(new Map());
  
  const [viewportPos, setViewportPos] = useState({ x: 0, y: 0 });
  const [projectedPos, setProjectedPos] = useState<{x: number, y: number} | null>(null);
  const DEFAULT_ZOOM = 35;
  const followDistanceRef = useRef(DEFAULT_ZOOM);
  const [dummy, setDummy] = useState(0);

  // 优先级逻辑：Hover 永远最高，无论是自车还是物体
  // 如果没有 Hover，则显示选中的物体或自车
  const displayMode = useMemo(() => {
    if (hoveredId) return 'object';
    if (isNaviHovered) return 'navi';
    if (selectedId) return 'object';
    if (isNaviSelected) return 'navi';
    return 'none';
  }, [hoveredId, isNaviHovered, selectedId, isNaviSelected]);

  const displayObject = useMemo(() => {
    if (displayMode === 'object') {
      const id = hoveredId ?? selectedId;
      return frame.objs.find(o => o.id === id);
    }
    return null;
  }, [frame.objs, displayMode, hoveredId, selectedId]);

  const isPinned = !hoveredId && !isNaviHovered && (!!selectedId || isNaviSelected);

  useImperativeHandle(ref, () => ({
    zoomIn: () => { 
      followDistanceRef.current = Math.max(5, followDistanceRef.current * 0.85); 
      setDummy(d => d + 1); 
    },
    zoomOut: () => { 
      followDistanceRef.current = Math.min(1500, followDistanceRef.current * 1.15);
      setDummy(d => d + 1); 
    },
    resetCamera: () => { 
      followDistanceRef.current = DEFAULT_ZOOM; 
      if (controlsRef.current && cameraRef.current) {
        controlsRef.current.reset();
        cameraRef.current.position.set(0, 12, 30);
        controlsRef.current.target.set(0, 0, -10);
        controlsRef.current.update();
      }
      setDummy(d => d + 1); 
    }
  }));

  // 处理屏幕投影：使 Pinned 状态下的信息框跟随 3D 物体
  useEffect(() => {
    if (!isPinned || !cameraRef.current || !containerRef.current) {
      setProjectedPos(null);
      return;
    }

    const updateProjection = () => {
      if (!cameraRef.current || !containerRef.current) return;
      
      let worldPos = new THREE.Vector3(0, 1.5, 0); // 默认坐标
      if (displayMode === 'object' && displayObject) {
        const pos = calculateRelativePosition(displayObject, frame.navi);
        worldPos.set(pos.x, 1.5, pos.z);
      } else if (displayMode === 'navi') {
        worldPos.set(0, 1.5, 0); // 自车始终在 3D 世界的原点
      } else {
        return;
      }

      worldPos.project(cameraRef.current);
      const rect = containerRef.current.getBoundingClientRect();
      const x = (worldPos.x * 0.5 + 0.5) * rect.width;
      const y = (-worldPos.y * 0.5 + 0.5) * rect.height;

      if (worldPos.z < 1) {
        setProjectedPos({ x: x + rect.left, y: y + rect.top });
      } else {
        setProjectedPos(null);
      }
    };

    updateProjection();
    const interval = setInterval(updateProjection, 16);
    return () => clearInterval(interval);
  }, [isPinned, displayMode, displayObject, frame.navi, dummy]);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    scene.fog = new THREE.Fog(0x020408, 100, 1500);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 10000);
    camera.position.set(0, 12, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 2;
    controls.maxDistance = 2000;
    controls.enableZoom = false; 
    controlsRef.current = controls;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomSpeed = 0.0015;
        const delta = e.deltaY;
        followDistanceRef.current = Math.max(5, Math.min(1500, followDistanceRef.current * (1 + delta * zoomSpeed)));
        setDummy(d => d + 1);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    });
    resizeObserver.observe(containerRef.current);

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !cameraRef.current || !objectsGroupRef.current || !hostGroupRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setViewportPos({ x: e.clientX, y: e.clientY });

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      mouseRef.current.x = (relX / rect.width) * 2 - 1;
      mouseRef.current.y = -(relY / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // 先测自车
      const hostIntersects = raycasterRef.current.intersectObjects(hostGroupRef.current.children, true);
      if (hostIntersects.length > 0) {
        onNaviHover?.(true);
        onObjectHover?.(null);
        containerRef.current.style.cursor = 'pointer';
        return;
      } else {
        onNaviHover?.(false);
      }

      // 再测物体
      const objectIntersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);
      if (objectIntersects.length > 0) {
        let parent: any = objectIntersects[0].object;
        while (parent && !parent.userData.id) parent = parent.parent;
        if (parent && parent.userData.id) { 
          onObjectHover?.(parent.userData.id); 
          containerRef.current.style.cursor = 'pointer'; 
        } else { 
          onObjectHover?.(null); 
          containerRef.current.style.cursor = 'default'; 
        }
      } else { 
        onObjectHover?.(null); 
        containerRef.current.style.cursor = 'default'; 
      }
    };

    const onClick = () => {
      if (!cameraRef.current || !objectsGroupRef.current || !hostGroupRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // 点击判定：自车优先
      const hostIntersects = raycasterRef.current.intersectObjects(hostGroupRef.current.children, true);
      if (hostIntersects.length > 0) {
        onNaviClick?.(true);
        onObjectClick?.(null);
        return;
      }

      const objectIntersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);
      if (objectIntersects.length > 0) {
        let parent: any = objectIntersects[0].object;
        while (parent && !parent.userData.id) parent = parent.parent;
        if (parent && parent.userData.id) {
          onObjectClick?.(parent.userData.id);
          onNaviClick?.(false);
        }
      } else { 
        onObjectClick?.(null); 
        onNaviClick?.(false);
      }
    };

    containerRef.current.addEventListener('pointermove', onPointerMove);
    containerRef.current.addEventListener('click', onClick);
    containerRef.current.addEventListener('wheel', onWheel, { passive: false });
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dLight.position.set(50, 150, 50);
    scene.add(dLight);
    
    const groundGroup = new THREE.Group();
    scene.add(groundGroup);
    groundGroupRef.current = groundGroup;

    const majorGrid = new THREE.GridHelper(2000, 200, 0x1e293b, 0x0f172a);
    majorGrid.position.y = -0.01;
    groundGroup.add(majorGrid);

    const minorGrid = new THREE.GridHelper(2000, 1000, 0x0f172a, 0x080c14);
    minorGrid.position.y = -0.02;
    groundGroup.add(minorGrid);

    const hostGroup = new THREE.Group();
    scene.add(hostGroup);
    hostGroupRef.current = hostGroup;

    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    let isDisposed = false;
    const animate = () => { 
      if (isDisposed) return;
      requestAnimationFrame(animate); 
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current); 
    };
    animate();

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener('pointermove', onPointerMove);
      containerRef.current?.removeEventListener('click', onClick);
      containerRef.current?.removeEventListener('wheel', onWheel);
      renderer.dispose();
      objectCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !objectsGroupRef.current || !hostGroupRef.current || !groundGroupRef.current || !cameraRef.current || !controlsRef.current) return;
    const { navi, objs } = frame;
    
    const gridStep = 10;
    groundGroupRef.current.position.x = - (navi.east % gridStep);
    groundGroupRef.current.position.z = (navi.north % gridStep);
    hostGroupRef.current.rotation.y = navi.theta - Math.PI / 2;
    
    if (hostGroupRef.current.children.length === 0) {
      const carBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.8, 4.8), 
        new THREE.MeshPhongMaterial({ color: 0xe2e8f0, emissive: 0x3b82f6, emissiveIntensity: 0.15 })
      );
      carBody.position.y = 0.4;
      hostGroupRef.current.add(carBody);
      
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 2.2),
        new THREE.MeshPhongMaterial({ color: 0x0f172a, transparent: true, opacity: 0.9 })
      );
      roof.position.set(0, 1.1, -0.3);
      hostGroupRef.current.add(roof);

      const lightGeo = new THREE.BoxGeometry(0.5, 0.1, 0.05);
      const leftLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      leftLight.position.set(0.7, 0.4, 2.4);
      const rightLight = leftLight.clone();
      rightLight.position.set(-0.7, 0.4, 2.4);
      hostGroupRef.current.add(leftLight, rightLight);

      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 5); arrowShape.lineTo(2, 0); arrowShape.lineTo(0.7, 0);
      arrowShape.lineTo(0.7, -4); arrowShape.lineTo(-0.7, -4); arrowShape.lineTo(-0.7, 0);
      arrowShape.lineTo(-2, 0); arrowShape.lineTo(0, 5);
      const arrowGeo = new THREE.ShapeGeometry(arrowShape);
      const arrowMesh = new THREE.Mesh(
        arrowGeo, 
        new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      arrowMesh.rotation.x = -Math.PI / 2;
      arrowMesh.position.y = 0.03;
      hostGroupRef.current.add(arrowMesh);
    }

    // 自车选中环
    const naviRingId = "navi-selection-ring";
    let naviRing = hostGroupRef.current.getObjectByName(naviRingId) as THREE.Mesh;
    if (isNaviSelected || isNaviHovered) {
      if (!naviRing) {
        naviRing = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.4, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: isNaviSelected ? 0x3b82f6 : 0xffffff, transparent: true, opacity: 0.7 }));
        naviRing.name = naviRingId;
        naviRing.position.y = 0.05;
        hostGroupRef.current.add(naviRing);
      } else {
        (naviRing.material as THREE.MeshBasicMaterial).color.set(isNaviSelected ? 0x3b82f6 : 0xffffff);
      }
    } else if (naviRing) {
      hostGroupRef.current.remove(naviRing);
    }

    if (isFollowing) {
      const dist = followDistanceRef.current;
      const camX = -Math.cos(navi.theta) * dist;
      const camZ = Math.sin(navi.theta) * dist;
      const camY = Math.max(2, dist * 0.4); 
      const cameraPos = new THREE.Vector3(camX, camY, camZ);
      const lookAheadDist = 20;
      const targetX = Math.cos(navi.theta) * lookAheadDist;
      const targetZ = -Math.sin(navi.theta) * lookAheadDist;
      const targetPos = new THREE.Vector3(targetX, 0.5, targetZ);
      cameraRef.current.position.lerp(cameraPos, 0.15);
      controlsRef.current.target.lerp(targetPos, 0.15);
      controlsRef.current.update();
    }

    const currentIds = new Set(objs.map(o => o.id));
    for (const [id, cached] of objectCacheRef.current.entries()) {
      if (!currentIds.has(id)) {
        if (objectsGroupRef.current) objectsGroupRef.current.remove(cached.group);
        cached.group.traverse((o: any) => { 
          if (o.geometry) o.geometry.dispose(); 
          if (o.material) Array.isArray(o.material) ? o.material.forEach((m: any) => m.dispose()) : o.material.dispose(); 
        });
        objectCacheRef.current.delete(id);
      }
    }

    objs.forEach((obj) => {
      const color = KIND_COLORS[obj.kind] || '#9ca3af';
      const pos = calculateRelativePosition(obj, navi);
      const isSelected = selectedId === obj.id;
      const isHovered = hoveredId === obj.id;
      const state = isSelected ? 'selected' : (isHovered ? 'hovered' : 'normal');

      let cached = objectCacheRef.current.get(obj.id);
      if (!cached) {
        const group = new THREE.Group();
        group.userData = { id: obj.id };
        const mesh = Object3DFactory.createMesh(obj.kind, color);
        group.add(mesh);

        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256; labelCanvas.height = 80;
        const labelCtx = labelCanvas.getContext('2d')!;
        const labelTex = new THREE.CanvasTexture(labelCanvas);
        const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }));
        labelSprite.scale.set(3.5, 1.1, 1); labelSprite.position.y = 3.5;
        group.add(labelSprite);

        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(1.5, 16), 
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
        );
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01;
        group.add(shadow);

        cached = { group, mesh, labelSprite, labelCanvas, labelCtx, lastVel: -1, lastState: 'normal' };
        objectCacheRef.current.set(obj.id, cached);
        if (objectsGroupRef.current) objectsGroupRef.current.add(group);
      }

      cached.group.position.set(pos.x, 0, pos.z);
      const hRad = obj.theta / 1000;
      cached.mesh.rotation.y = hRad - Math.PI / 2;
      applyObjectScaling(cached.mesh, obj);

      const isMoving = obj.vel > 0;
      if (isMoving) {
        const vRad = obj.vel_theta / 1000;
        const vDir = new THREE.Vector3(Math.cos(vRad), 0, -Math.sin(vRad));
        const len = Math.min(obj.vel / 3.6, 15) + 3.0; 
        if (!cached.arrow) { 
          cached.arrow = new THREE.ArrowHelper(vDir, new THREE.Vector3(0, 0.2, 0), len, color, 1.5, 0.8); 
          cached.group.add(cached.arrow); 
        } else { 
          cached.arrow.setDirection(vDir); 
          cached.arrow.setLength(len, 1.5, 0.8); 
          cached.arrow.setColor(color); 
        }
      } else if (cached.arrow) {
        cached.group.remove(cached.arrow);
        cached.arrow = undefined;
      }

      if (isSelected || isHovered) {
        if (!cached.ring) {
          cached.ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: isSelected ? 0x60a5fa : 0xffffff, transparent: true, opacity: 0.7 }));
          cached.ring.position.y = 0.05; cached.group.add(cached.ring);
        } else (cached.ring.material as THREE.MeshBasicMaterial).color.set(isSelected ? 0x60a5fa : 0xffffff);
      } else if (cached.ring) { cached.group.remove(cached.ring); cached.ring = undefined; }

      if (Math.round(obj.vel) !== Math.round(cached.lastVel) || state !== cached.lastState) {
        drawObjectLabel(cached.labelCtx, cached.labelCanvas, obj, isSelected, color);
        cached.labelSprite.material.map!.needsUpdate = true;
        cached.lastVel = obj.vel; cached.lastState = state;
      }
    });
  }, [frame, isFollowing, selectedId, hoveredId, isNaviSelected, isNaviHovered, dummy]);

  const finalX = isPinned && projectedPos ? projectedPos.x : viewportPos.x;
  const finalY = isPinned && projectedPos ? projectedPos.y : viewportPos.y;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {displayMode !== 'none' && (
        <div 
          className={`fixed z-[150] pointer-events-none bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 min-w-[240px] transition-transform duration-75 ease-out ${isPinned ? (displayMode === 'navi' ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-500/30') : ''}`}
          style={{ 
            left: finalX, 
            top: finalY,
            transform: `
              translate(
                ${finalX + 280 > window.innerWidth ? '-110%' : '20px'}, 
                ${finalY + 340 > window.innerHeight ? '-110%' : '20px'}
              )
            `
          }}
        >
          {displayMode === 'object' && displayObject ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Spatial Inspector</span>
                    {isPinned && <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse"><Pin size={8} /> Pinned</span>}
                  </div>
                  <span className="text-sm font-black text-white italic tracking-tighter uppercase">{KIND_LABELS[displayObject.kind] || 'Object'} #{displayObject.id}</span>
                </div>
                <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: KIND_COLORS[displayObject.kind] || '#6b7280' }} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 opacity-60"><Activity size={10} className="text-blue-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Speed</span></div>
                  <span className="text-xs font-mono font-bold text-white">{displayObject.vel.toFixed(1)} <span className="text-[8px] text-slate-600">KM/H</span></span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 opacity-60"><Compass size={10} className="text-amber-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Theta (Yaw)</span></div>
                  <span className="text-xs font-mono font-bold text-white">{(displayObject.theta / 1000).toFixed(3)} <span className="text-[8px] text-slate-600">RAD</span></span>
                </div>
                <div className="col-span-2 flex flex-col gap-2 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1.5 opacity-60"><Ruler size={10} className="text-green-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Box Dimensions (L x W x H)</span></div>
                  <div className="flex items-center justify-between">
                    {(() => {
                      const dims = getObjectDimensions(displayObject);
                      return <div className="flex gap-2 items-baseline"><span className="text-xs font-mono font-bold text-slate-200">{dims.length.toFixed(2)}</span><span className="text-[8px] text-slate-600">m</span><span className="text-slate-700 mx-0.5">×</span><span className="text-xs font-mono font-bold text-slate-200">{dims.width.toFixed(2)}</span><span className="text-[8px] text-slate-600">m</span><span className="text-slate-700 mx-0.5">×</span><span className="text-xs font-mono font-bold text-slate-200">{dims.height.toFixed(2)}</span><span className="text-[8px] text-slate-600">m</span></div>;
                    })()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-blue-500/30 pb-2 mb-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-tight">Master Telemetry</span>
                    {isPinned && <span className="flex items-center gap-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse"><Pin size={8} /> Host Pinned</span>}
                  </div>
                  <span className="text-sm font-black text-white italic tracking-tighter uppercase">Host Vehicle (Self)</span>
                </div>
                <Navigation size={18} className="text-blue-500 fill-current" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 opacity-60"><Activity size={10} className="text-blue-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Velocity</span></div>
                  <span className="text-xs font-mono font-bold text-white">{(frame.navi.vel * 3.6).toFixed(1)} <span className="text-[8px] text-slate-600">KM/H</span></span>
                  <span className="text-[9px] font-mono text-slate-500">({frame.navi.vel.toFixed(2)} m/s)</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 opacity-60"><Compass size={10} className="text-amber-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Heading</span></div>
                  <span className="text-xs font-mono font-bold text-white">{frame.navi.theta.toFixed(4)} <span className="text-[8px] text-slate-600">RAD</span></span>
                </div>
                <div className="col-span-2 flex flex-col gap-2 border-t border-white/5 pt-2">
                   <div className="flex items-center gap-1.5 opacity-60"><MapPin size={10} className="text-red-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Global Coordinates (ENU)</span></div>
                   <div className="grid grid-cols-3 gap-1">
                      <div className="bg-white/5 p-1.5 rounded-lg flex flex-col"><span className="text-[7px] text-slate-500 font-bold">EAST</span><span className="text-[10px] font-mono font-bold text-white">{frame.navi.east.toFixed(2)}</span></div>
                      <div className="bg-white/5 p-1.5 rounded-lg flex flex-col"><span className="text-[7px] text-slate-500 font-bold">NORTH</span><span className="text-[10px] font-mono font-bold text-white">{frame.navi.north.toFixed(2)}</span></div>
                      <div className="bg-white/5 p-1.5 rounded-lg flex flex-col"><span className="text-[7px] text-slate-500 font-bold">HEIGHT</span><span className="text-[10px] font-mono font-bold text-white">{frame.navi.height.toFixed(2)}</span></div>
                   </div>
                </div>
                <div className="flex flex-col gap-0.5 pt-2">
                  <div className="flex items-center gap-1.5 opacity-60"><Activity size={10} className="text-purple-400" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Yaw Rate</span></div>
                  <span className="text-xs font-mono font-bold text-slate-200">{frame.navi.yaw_angular_speed.toFixed(3)} <span className="text-[8px] text-slate-600">rad/s</span></span>
                </div>
              </div>
            </>
          )}
          <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">3D Reconstruction Link</span>
            </div>
            <span className="text-[7px] font-mono text-slate-700">TS: {frame.timestamp.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default PlaybackCanvas;
