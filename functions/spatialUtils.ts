
import * as THREE from 'three';
import { MOTObject, ObjectKind } from '../types';

/**
 * Calculates and applies local scaling to a 3D mesh based on MOT object metadata and kind.
 * It uses vertex points to determine real-world length/width or falls back to standard dimensions.
 * 
 * @param mesh The THREE.Group containing the object's geometry.
 * @param obj The MOT object data containing vertex points and kind.
 */
export const applyObjectScaling = (mesh: THREE.Group, obj: MOTObject) => {
  // Reference dimensions (meters) for standard models
  let refWidth = 2.0, refLength = 4.5, refHeight = 1.5;
  
  switch (obj.kind) {
    case ObjectKind.HUMAN: refWidth = 0.6; refLength = 0.6; refHeight = 1.7; break;
    case ObjectKind.TRUCK: case ObjectKind.BUS: refWidth = 2.5; refLength = 8.0; refHeight = 3.0; break;
    case ObjectKind.CONE: refWidth = 0.5; refLength = 0.5; refHeight = 0.7; break;
    case ObjectKind.BICYCLE: refWidth = 0.6; refLength = 1.8; refHeight = 1.2; break;
  }

  let actualLength = refLength;
  let actualWidth = refWidth;

  // Attempt to derive footprint from vertex points if available
  if (obj.vertex_points && obj.vertex_points.length >= 3) {
    const p0 = obj.vertex_points[0], p1 = obj.vertex_points[1], p2 = obj.vertex_points[2];
    const side1 = Math.sqrt(Math.pow(p1[0] - p0[0], 2) + Math.pow(p1[1] - p0[1], 2));
    const side2 = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
    
    if (side1 > 0.01 && side2 > 0.01) {
      actualLength = Math.max(side1, side2);
      actualWidth = Math.min(side1, side2);
    }
  }

  // Use height from data if it's significant, otherwise use reference
  const actualHeight = obj.height > 10 ? obj.height / 100 : refHeight;
  mesh.scale.set(actualWidth / refWidth, actualHeight / refHeight, actualLength / refLength);
};

/**
 * Computes the relative position of an object in the scene local to the host vehicle's origin.
 */
export const calculateRelativePosition = (obj: MOTObject, navi: { east: number, north: number }) => {
  const relX = (obj.vertex_points.reduce((a, b) => a + b[0], 0) / (obj.vertex_points.length || 1)) - navi.east;
  const relZ = (obj.vertex_points.reduce((a, b) => a + b[1], 0) / (obj.vertex_points.length || 1)) - navi.north;
  return { x: relX, z: -relZ };
};
