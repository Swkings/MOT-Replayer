
export enum ObjectKind {
  CAR = 0,
  TRUCK = 1,
  BUS = 2,
  BICYCLE = 3,
  TRIPLE_WHEEL = 4,
  HUMAN = 5,
  ANIMAL = 6,
  OTHER = 7,
  LINE = 8,
  RADAR = 9,
  DOLLY = 10,
  CONE = 11,
  BIRD = 12,
  FIRE_TRUCK = 13,
  TRAILER = 14,
  AGV = 15,
  BLIND_AREA = 16,
  AIRPLANE = 17,
  SMALL_OBJ = 18,
  LIFTER = 19,
  DOLLY_BLIND_AREA = 20,
  HIGH_OBJ = 21,
  FOLLOW_HUMAN = 22,
  FOLLOW_CAR = 23,
  WINGDOOR = 24,
  COOP_VEH_FUSE = 25,
  UNKNOWN = 26,
  UNCERTAIN = 27,
  ACCESSORY = 28,
  DOLLY_HUMAN_SHUTTLE = 29,
  STATIC = 500,
  HOLE = 501,
  SPEED_BUMP = 502,
  BOOM_BARRIER = 503,
  NOISE_OBJ = 504,
  EXPRESS_CARGO = 505,
  SIGN_BOARD = 506,
  STEAM_LIGHT = 507,
  STEAM_HEAVY = 508,
  ROLLING_DOOR = 509,
  DOLLY_BLOCK = 510,
  LSLOC = 1000,
  TRUNK = 1001,
  POLE = 1002,
  CROSS_BAR = 1003,
  BOARD = 1004,
  BRAND = 1005,
  BOX = 1006,
  PILLAR = 1007,
  TUNNEL_GROOVE = 1008,
  TUNNEL_FAN = 1009
}

export interface MOTObject {
  id: number;
  theta: number; // 0.001 radian
  vel: number; // km/h
  vel_theta: number; // 0.001 radian
  height: number; // cm
  kind: ObjectKind;
  vertex_points: [number, number][]; // 4 points [x, y] in meters
  lower_z: number; // meters
  veh_light_kind: number;
}

export interface NaviData {
  east: number;
  north: number;
  height: number;
  theta: number; // radians
  alpha: number;
  beta: number;
  vel: number; // m/s
  yaw_angular_speed: number;
  ts: number;
}

export interface MOTFrame {
  timestamp: number;
  navi: NaviData;
  objs: MOTObject[];
  vin?: string;
  raw?: string; // Original JSON payload
}

export type SourceType = 'LOG' | 'MQTT' | 'WEBSOCKET';

export interface ConnectionConfig {
  protocol: string;
  url: string;
  port?: number;
  topic?: string;
  username?: string;
  password?: string;
}

export interface MOTInstance {
  id: string;
  name: string;
  createdAt: number;
  frameCount: number;
  frames: MOTFrame[];
  vin?: string;
  sourceType: SourceType;
  connectionConfig?: ConnectionConfig;
}

export interface PlaybackState {
  currentFrameIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  frames: MOTFrame[];
}
