import * as THREE from 'three';
import type { WeaponConfig } from '../config';

const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
export class HUD {
  kills=0;combo=0;private comboTimer=0;
  show(){ $('#hud').classList.remove('hidden');$('#start-screen').style.display='none' }
  connection(connected:boolean,count:number){$('#connection').textContent=connected?'SYNCED':'OFFLINE SOLO';$('#connection').classList.toggle('connected',connected);$('#online b').textContent=String(count)}
  weapon(config:WeaponConfig,ammo:number,reserve:number,index:number,reload=0){$('#weapon small').textContent=`${index+1} · WEAPON`;$('#weapon strong').textContent=config.name;$('#weapon div b').textContent=String(ammo);$('#weapon div span').textContent=Number.isFinite(reserve)?String(reserve):'∞';$('#weapon em').style.width=`${reload*100}%`}
  health(hp:number){$('#health b').textContent=String(Math.ceil(hp));$('#health span').style.width=`${hp}%`;if(hp<100){const f=$('#damage-flash');f.style.opacity=String(Math.min(.7,(100-hp)/100));setTimeout(()=>f.style.opacity='0',80)}}
  hit(damage:number,headshot:boolean,world:THREE.Vector3,camera:THREE.Camera){const hm=$('#hitmarker');hm.classList.add('show');setTimeout(()=>hm.classList.remove('show'),80);const p=world.clone().project(camera);const el=document.createElement('div');el.className=`damage-number ${headshot?'crit':''}`;el.textContent=headshot?`CRIT ${Math.round(damage)}`:String(Math.round(damage));el.style.left=`${(p.x*.5+.5)*innerWidth}px`;el.style.top=`${(-p.y*.5+.5)*innerHeight}px`;$('#damage-numbers').append(el);setTimeout(()=>el.remove(),800)}
  kill(){this.kills++;this.combo++;this.comboTimer=4;$('#kills').textContent=String(this.kills);$('#combo').textContent=String(this.combo);const milestones=[10,25,50,100,250];if(milestones.includes(this.kills))this.message(`${this.kills} KILL`);else if(this.combo%10===0)this.message(`🔥 ${this.combo} COMBO`)}
  message(text:string){const e=$('#streak');e.textContent=text;e.animate([{transform:'translateX(-50%) scale(1.8)',opacity:0},{transform:'translateX(-50%) scale(1)',opacity:1},{opacity:0}],{duration:1600});setTimeout(()=>e.textContent='',1600)}
  update(dt:number){if(this.comboTimer>0&&(this.comboTimer-=dt)<=0){this.combo=0;$('#combo').textContent='0'}}
  boss(hp:number,max:number,distance:number){$('#boss').style.display=hp>0?'block':'none';$('#boss-fill').style.width=`${Math.max(0,hp/max)*100}%`;$('#boss-distance').textContent=` · ${Math.round(distance)}m`}
  performance(fps:number,calls:number,quality:number){$('#perf').textContent=`FPS ${Math.round(fps)} · DRAW ${calls} · Q ${Math.round(quality*100)}%`;$('#perf').style.color=fps<42?'#ff5b45aa':fps<55?'#ffd34eaa':'#d7ff35aa'}
  minimap(player:THREE.Vector3,yaw:number,monsters:Array<{x:number;z:number;kind:string}>,players:Array<{x:number;z:number}>,structures:Array<{x:number;z:number;kind:string}>){
    const canvas=$<HTMLCanvasElement>('#minimap-canvas'),ctx=canvas.getContext('2d')!,center=180,range=120,scale=164/range;ctx.clearRect(0,0,360,360);ctx.save();ctx.beginPath();ctx.arc(center,center,174,0,Math.PI*2);ctx.clip();ctx.fillStyle='#0c1715dd';ctx.fillRect(0,0,360,360);ctx.strokeStyle='#52645d66';ctx.lineWidth=1;for(const r of[56,112,170]){ctx.beginPath();ctx.arc(center,center,r,0,Math.PI*2);ctx.stroke()}ctx.beginPath();ctx.moveTo(center,8);ctx.lineTo(center,352);ctx.moveTo(8,center);ctx.lineTo(352,center);ctx.stroke();
    const point=(x:number,z:number)=>({x:center+(x-player.x)*scale,y:center+(z-player.z)*scale});ctx.fillStyle='#ffc45b';for(const s of structures){if(Math.hypot(s.x-player.x,s.z-player.z)>range)continue;const p=point(s.x,s.z);ctx.fillRect(p.x-1.7,p.y-1.7,3.4,3.4)}
    let hostile=0;for(const m of monsters){if(Math.hypot(m.x-player.x,m.z-player.z)>range)continue;hostile++;const p=point(m.x,m.z),size=m.kind==='titan'?5.5:m.kind==='tank'?3:m.kind==='runner'?2:1.6;ctx.fillStyle=m.kind==='titan'?'#ff1e89':'#ff443d';ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#58ff79';for(const other of players){if(Math.hypot(other.x-player.x,other.z-player.z)>range)continue;const p=point(other.x,other.z);ctx.beginPath();ctx.arc(p.x,p.y,3.4,0,Math.PI*2);ctx.fill()}
    ctx.translate(center,center);ctx.rotate(-yaw);ctx.fillStyle='#d7ff35';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,8);ctx.lineTo(0,5);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.restore();$('#map-count').textContent=`${hostile} HOSTILES · 120m`;
  }
}
