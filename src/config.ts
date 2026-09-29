import type { WeaponId } from '../shared/protocol';

export interface WeaponConfig {
  id: WeaponId; name: string; damage: number; fireRate: number; magazine: number;
  reserve: number; reload: number; spread: number; pellets: number; range: number;
  recoil: number; color: number; automatic: boolean; warmup?: number; explosive?: number;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  rifle: { id:'rifle', name:'AK-47 // IRON FANG', damage:24, fireRate:10, magazine:30, reserve:Infinity, reload:1.7, spread:.009, pellets:1, range:220, recoil:.018, color:0xffcc55, automatic:true },
  smg: { id:'smg', name:'VX-9 // HORNET', damage:14, fireRate:17, magazine:50, reserve:Infinity, reload:1.4, spread:.022, pellets:1, range:140, recoil:.010, color:0x5ffff5, automatic:true },
  shotgun: { id:'shotgun', name:'M12 // BOOMSTICK', damage:22, fireRate:1.15, magazine:8, reserve:Infinity, reload:2.1, spread:.105, pellets:10, range:65, recoil:.065, color:0xff8533, automatic:false },
  minigun: { id:'minigun', name:'M134 // MEAT GRINDER', damage:11, fireRate:28, magazine:240, reserve:Infinity, reload:3.8, spread:.028, pellets:1, range:180, recoil:.008, color:0xffe96b, automatic:true, warmup:.35 },
  rpg: { id:'rpg', name:'RPG-7 // APOCALYPSE', damage:420, fireRate:.55, magazine:1, reserve:Infinity, reload:2.5, spread:0, pellets:1, range:260, recoil:.10, color:0xff5533, automatic:false, explosive:18 }
};

export const MAP_SIZE = 6000;
export const CHUNK_SIZE = 100;
