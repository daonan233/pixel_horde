export type WeaponId = 'rifle' | 'smg' | 'shotgun' | 'minigun' | 'rpg';
export type MonsterKind = 'zombie' | 'runner' | 'tank' | 'titan';

export interface Vec3Data { x: number; y: number; z: number }
export interface PlayerSnapshot extends Vec3Data { id: string; name: string; yaw: number; hp: number; weapon: WeaponId }
export interface MonsterSnapshot extends Vec3Data { id: number; kind: MonsterKind; hp: number; maxHp: number; vx: number; vz: number }
export interface WorldSnapshot { time: number; players: PlayerSnapshot[]; monsters: MonsterSnapshot[]; bossId: number | null }
export interface InputMessage extends Vec3Data { yaw: number; weapon: WeaponId }
export interface ShotMessage { weapon: WeaponId; origin: Vec3Data; direction: Vec3Data; seed: number }
export interface CombatEvent { type: 'hit' | 'kill' | 'explosion' | 'rocket' | 'playerHit' | 'pickup'; monsterId?: number; damage?: number; headshot?: boolean; x?: number; y?: number; z?: number; vx?: number; vy?: number; vz?: number; targetId?: string; hp?: number }
