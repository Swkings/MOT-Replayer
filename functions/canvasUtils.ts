
import { MOTObject } from '../types';

/**
 * Renders a stylized label onto a 2D canvas context for use as a 3D sprite texture.
 * 
 * @param ctx The Canvas 2D context.
 * @param canvas The HTMLCanvasElement.
 * @param obj The MOT object data.
 * @param isSelected Whether the object is currently selected.
 * @param color The theme color associated with the object kind.
 */
export const drawObjectLabel = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  obj: MOTObject,
  isSelected: boolean,
  color: string
) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Background selection
  ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.95)' : 'rgba(15, 23, 42, 0.85)';
  
  // Rounded Box drawing
  ctx.beginPath();
  const x = 10, y = 5, w = 236, h = 70, r = 10;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // ID Text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(`ID:${obj.id}`, 128, 32);
  
  // Speed Text - Force 0 if below threshold
  const displayVel = obj.vel < 0.5 ? 0 : Math.round(obj.vel);
  ctx.fillStyle = isSelected ? 'white' : color;
  ctx.font = 'bold 24px JetBrains Mono';
  ctx.fillText(`${displayVel} KM/H`, 128, 62);
};