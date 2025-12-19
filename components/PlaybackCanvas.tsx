
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MOTFrame, MOTObject } from '../types';
import { KIND_COLORS } from '../constants';
import { Object3DFactory } from './MotObject/Object3D';
import { applyObjectScaling, calculateRelativePosition } from '../functions/spatialUtils';
import { drawObjectLabel } from '../functions/canvasUtils';

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
  onObjectClick?: (id: number | null) => void;
  onObjectHover?: (id: number | null) => void;
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
  onObjectClick, 
  onObjectHover 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const hostGroupRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const objectCacheRef = useRef<Map<number, CachedObject>>(new Map());
  
  // Adjusted default distance for better initial framing
  const DEFAULT_ZOOM = 35;
  const followDistanceRef = useRef(DEFAULT_ZOOM);
  const [dummy, setDummy] = useState(0);

  useImperativeHandle(ref, () => ({
    zoomIn: () => { 
      followDistanceRef.current = Math.max(8, followDistanceRef.current * 0.85); 
      setDummy(d => d + 1); 
    },
    zoomOut: () => { 
      followDistanceRef.current = Math.min(600, followDistanceRef.current * 1.15);
      setDummy(d => d + 1); 
    },
    resetCamera: () => { 
      followDistanceRef.current = DEFAULT_ZOOM; 
      if (controlsRef.current && cameraRef.current) {
        controlsRef.current.reset();
        cameraRef.current.position.set(0, 12, 30);
        controlsRef.current.target.set(0, 0, -10); // Look ahead by default
        controlsRef.current.update();
      }
      setDummy(d => d + 1); 
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    // Add denser fog for better depth perception
    scene.fog = new THREE.Fog(0x020408, 150, 800);
    sceneRef.current = scene;

    // Standard field of view for 3D simulations
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
    controls.minDistance = 5;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dLight.position.set(50, 150, 50);
    scene.add(dLight);
    
    // Adjusted grid for better spatial awareness
    const grid = new THREE.GridHelper(5000, 500, 0x1e293b, 0x0f172a);
    scene.add(grid);
    gridRef.current = grid;

    const hostGroup = new THREE.Group();
    scene.add(hostGroup);
    hostGroupRef.current = hostGroup;

    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

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

    const onPointerMove = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !objectsGroupRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);
      if (intersects.length > 0) {
        let parent: any = intersects[0].object;
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
      if (!cameraRef.current || !objectsGroupRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);
      if (intersects.length > 0) {
        let parent: any = intersects[0].object;
        while (parent && !parent.userData.id) parent = parent.parent;
        if (parent && parent.userData.id) onObjectClick?.(parent.userData.id);
      } else { onObjectClick?.(null); }
    };

    containerRef.current.addEventListener('mousemove', onPointerMove);
    containerRef.current.addEventListener('click', onClick);
    
    let isDisposed = false;
    const animate = () => { 
      if (isDisposed) return;
      requestAnimationFrame(animate); 
      if (controlsRef.current) {
        controlsRef.current.update();
        if (!isFollowing) {
           followDistanceRef.current = cameraRef.current!.position.distanceTo(controlsRef.current.target);
        }
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current); 
      }
    };
    animate();

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener('mousemove', onPointerMove);
      containerRef.current?.removeEventListener('click', onClick);
      renderer.dispose();
      objectCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !objectsGroupRef.current || !hostGroupRef.current || !cameraRef.current || !controlsRef.current) return;
    const { navi, objs } = frame;
    
    // Rotate host vehicle based on heading
    hostGroupRef.current.rotation.y = navi.theta - Math.PI / 2;
    
    if (hostGroupRef.current.children.length === 0) {
      // Create a more distinct host vehicle visual
      const carBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.8, 4.8), 
        new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444, emissiveIntensity: 0.05 })
      );
      carBody.position.y = 0.4;
      hostGroupRef.current.add(carBody);
      
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 2.0),
        new THREE.MeshPhongMaterial({ color: 0x1e293b, transparent: true, opacity: 0.9 })
      );
      roof.position.set(0, 1.1, -0.2);
      hostGroupRef.current.add(roof);
    }

    if (isFollowing) {
      const dist = followDistanceRef.current;
      // Calculate Chase Position: Camera sits BEHIND the car
      const camX = -Math.cos(navi.theta) * dist;
      const camZ = Math.sin(navi.theta) * dist;
      // Lower elevation for better "vision ahead"
      const camY = Math.max(3, dist * 0.32); 
      const cameraPos = new THREE.Vector3(camX, camY, camZ);
      
      // Calculate Look-ahead Target: Target sits AHEAD of the car
      const lookAheadDist = 15; // Focus on point 15m ahead
      const targetX = Math.cos(navi.theta) * lookAheadDist;
      const targetZ = -Math.sin(navi.theta) * lookAheadDist;
      const targetPos = new THREE.Vector3(targetX, 0.8, targetZ);
      
      // Smooth transitions
      cameraRef.current.position.lerp(cameraPos, 0.12);
      controlsRef.current.target.lerp(targetPos, 0.12);
      controlsRef.current.update();
    }

    // Object Rendering Logic
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

        const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
        shadow.rotation.x = Math.PI / 2; shadow.position.y = 0.01;
        group.add(shadow);

        cached = { group, mesh, labelSprite, labelCanvas, labelCtx, lastVel: -1, lastState: 'normal' };
        objectCacheRef.current.set(obj.id, cached);
        if (objectsGroupRef.current) objectsGroupRef.current.add(group);
      }

      cached.group.position.set(pos.x, 0, pos.z);
      
      const hRad = obj.theta / 1000;
      cached.mesh.rotation.y = hRad - Math.PI / 2;
      applyObjectScaling(cached.mesh, obj);

      const isMoving = obj.vel > 0.5;
      if (isMoving) {
        const vRad = obj.vel_theta / 1000;
        const vDir = new THREE.Vector3(Math.cos(vRad), 0, -Math.sin(vRad));
        const len = Math.min(obj.vel / 3.6, 20) + 3.0; 
        
        if (!cached.arrow) { 
          cached.arrow = new THREE.ArrowHelper(vDir, new THREE.Vector3(0, 0.2, 0), len, color, 1.8, 1.0); 
          cached.group.add(cached.arrow); 
        } else { 
          cached.arrow.setDirection(vDir); 
          cached.arrow.setLength(len, 1.8, 1.0); 
          cached.arrow.setColor(color); 
        }
      } else if (cached.arrow) {
        cached.group.remove(cached.arrow);
        cached.arrow = undefined;
      }

      if (isSelected || isHovered) {
        if (!cached.ring) {
          cached.ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: isSelected ? 0x60a5fa : 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
          cached.ring.position.y = 0.05; cached.group.add(cached.ring);
        } else (cached.ring.material as THREE.MeshBasicMaterial).color.set(isSelected ? 0x60a5fa : 0xffffff);
      } else if (cached.ring) { cached.group.remove(cached.ring); cached.ring = undefined; }

      if (Math.round(obj.vel) !== Math.round(cached.lastVel) || state !== cached.lastState) {
        drawObjectLabel(cached.labelCtx, cached.labelCanvas, obj, isSelected, color);
        cached.labelSprite.material.map!.needsUpdate = true;
        cached.lastVel = obj.vel; cached.lastState = state;
      }
    });
  }, [frame, isFollowing, selectedId, hoveredId, dummy]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
});

export default PlaybackCanvas;
