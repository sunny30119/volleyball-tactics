export type Vec2 = { x: number; z: number };          // 地面座標（公尺）
export type Role = 'S' | 'OH1' | 'OH2' | 'MB1' | 'MB2' | 'OP' | 'L'; // 舉球/主攻/攔中/輔舉/自由
export type DefenseSystem = 'perimeter' | 'rotation';  // 邊線防守 / 輪轉防守
export type LabelMode = 'number' | 'role';
export type CameraView = 'top' | 'baseline' | 'side' | 'coach';

export interface PlayerState {
  id: number;            // 1-6 號位
  role: Role;
  pos: Vec2;
  isBlocking: boolean;
}

export interface ZonePolygon {
  playerId: number;
  points: Vec2[];        // 責任區塊多邊形
}

export interface Attacker {
  id: string;
  pos: Vec2;
  isActive: boolean;
}

export interface DefenseResult {
  players: PlayerState[];
  zones: ZonePolygon[];
  blockShadow: Vec2[];        // 攔網影子多邊形（我方場地上）
  attackFan: {
    origin: Vec2;
    leftDir: Vec2;
    rightDir: Vec2;
    angleDeg: number;
  };
}

export interface DefenseOptions {
  system: DefenseSystem;
  middleBlockMode: 'single' | 'double';  // 對方3號位快攻的攔網人數設定
  fanAngleOverride: number | null;        // null=自動
  netHeight: number;                      // 2.24 / 2.30 / 2.43
}

export interface CustomScenario {
  id: string;
  name: string;
  attackPos: Vec2;
  system: DefenseSystem;
  players: PlayerState[];
  zones: ZonePolygon[];
  createdAt: number;
}
