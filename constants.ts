
import { ObjectKind } from './types';

export const KIND_COLORS: Record<number, string> = {
  [ObjectKind.CAR]: '#3b82f6', // Blue
  [ObjectKind.TRUCK]: '#ef4444', // Red
  [ObjectKind.BUS]: '#f59e0b', // Amber
  [ObjectKind.BICYCLE]: '#10b981', // Emerald
  [ObjectKind.HUMAN]: '#ec4899', // Pink
  [ObjectKind.OTHER]: '#9ca3af', // Gray
  [ObjectKind.UNKNOWN]: '#6b7280', // Slate
  [ObjectKind.CONE]: '#f97316', // Orange
  [ObjectKind.AGV]: '#8b5cf6', // Violet
};

export const KIND_LABELS: Record<number, string> = {
  [ObjectKind.CAR]: 'Car',
  [ObjectKind.TRUCK]: 'Truck',
  [ObjectKind.BUS]: 'Bus',
  [ObjectKind.BICYCLE]: 'Bicycle',
  [ObjectKind.HUMAN]: 'Human',
  [ObjectKind.OTHER]: 'Other',
  [ObjectKind.UNKNOWN]: 'Unknown',
  [ObjectKind.CONE]: 'Cone',
  [ObjectKind.AGV]: 'AGV',
  [ObjectKind.TRIPLE_WHEEL]: '3-Wheel',
  [ObjectKind.FIRE_TRUCK]: 'Fire Truck',
  [ObjectKind.AIRPLANE]: 'Airplane',
  [ObjectKind.PILLAR]: 'Pillar',
  [ObjectKind.POLE]: 'Pole',
  [ObjectKind.TRAILER]: 'Trailer',
  [ObjectKind.FOLLOW_CAR]: 'Follow Car',
};

export const DEFAULT_COLOR = '#9ca3af';
