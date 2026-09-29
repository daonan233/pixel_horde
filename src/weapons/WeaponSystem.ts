import * as THREE from 'three';
import { WEAPONS, type WeaponConfig } from '../config';
import type { ShotMessage, WeaponId } from '../../shared/protocol';
import { Effects } from '../effects/Effects';
import { MonsterSystem } from '../monsters/MonsterSystem';
import { Network } from '../network/Network';
import { HUD } from '../ui/HUD';
import { PlayerController } from '../player/PlayerController';

const ORDER:WeaponId[]=['rifle','smg','shotgun','minigun','rpg'];
export class WeaponSystem {
  current:WeaponId='rifle'; private ammo=new Map<WeaponId,number>();private reserve=new Map<WeaponId,number>();private trigger=false;private pressed=false;private cooldown=0;private reloadLeft=0;private heat=0;private model=new THREE.Group();private audio?:AudioContext;private recoilKick=0;private reloadPart?:THREE.Object3D;private reloadPartBase=new THREE.Vector3();
  constructor(private camera:THREE.PerspectiveCamera,private player:PlayerController,private monsters:MonsterSystem,private effects:Effects,private network:Network,private hud:HUD){
    for(const id of ORDER){this.ammo.set(id,WEAPONS[id].magazine);this.reserve.set(id,WEAPONS[id].reserve)}camera.add(this.model);this.buildModel();
    addEventListener('mousedown',e=>{if(!this.player.locked)return;if(e.button===0){this.trigger=true;this.pressed=true}if(e.button===2)this.aim(true)});addEventListener('mouseup',e=>{if(e.button===0)this.trigger=false;if(e.button===2)this.aim(false)});addEventListener('blur',()=>{this.trigger=false;this.pressed=false});document.addEventListener('pointerlockchange',()=>{if(!this.player.locked){this.trigger=false;this.pressed=false}});addEventListener('contextmenu',e=>e.preventDefault());
    addEventListener('keydown',e=>{if(e.code==='KeyR')this.reload();const n=Number(e.key);if(n>=1&&n<=5)this.select(ORDER[n-1])});
  }
  get config(){return WEAPONS[this.current]}
  update(dt:number){
    this.cooldown-=dt;this.recoilKick=THREE.MathUtils.damp(this.recoilKick,0,18,dt);const t=performance.now()*.001,speed=Math.hypot(this.player.velocity.x,this.player.velocity.z),walk=THREE.MathUtils.clamp(speed/10,0,1),step=Math.sin(t*(speed>13?13:9))*walk,reloadProgress=this.reloadLeft>0?1-this.reloadLeft/this.config.reload:0,reloadArc=Math.sin(reloadProgress*Math.PI);this.model.position.set(.31+Math.cos(t*4)*.012*walk,-.29+Math.abs(step)*.018-reloadArc*.18,-.94+this.recoilKick);this.model.rotation.set(-.03-this.recoilKick*.8+reloadArc*.28,-.22,step*.025+reloadArc*.38);
    if(this.reloadPart){const drop=Math.sin(THREE.MathUtils.clamp((reloadProgress-.12)/.76,0,1)*Math.PI);this.reloadPart.position.copy(this.reloadPartBase);this.reloadPart.position.y-=drop*.38;this.reloadPart.rotation.z=drop*.25}
    if(this.reloadLeft>0){this.reloadLeft-=dt;if(this.reloadLeft<=0){const need=this.config.magazine-(this.ammo.get(this.current)??0),got=Math.min(need,this.reserve.get(this.current)??0);this.ammo.set(this.current,(this.ammo.get(this.current)??0)+got);this.reserve.set(this.current,(this.reserve.get(this.current)??0)-got);if(this.reloadPart){this.reloadPart.position.copy(this.reloadPartBase);this.reloadPart.rotation.z=0}}this.refresh();return}
    const wants=this.trigger&&(this.config.automatic||this.pressed);if(this.current==='minigun')this.heat=THREE.MathUtils.clamp(this.heat+(wants?dt:-dt*2),0,1);else this.heat=1;if(wants&&this.heat>=(this.config.warmup??0)&&this.cooldown<=0)this.fire();this.pressed=false;
  }
  private fire(){const c=this.config,ammo=this.ammo.get(this.current)??0;if(ammo<=0){this.reload();return}this.ammo.set(this.current,ammo-1);this.cooldown=1/c.fireRate;const origin=this.camera.getWorldPosition(new THREE.Vector3());const direction=this.camera.getWorldDirection(new THREE.Vector3());const seed=Math.floor(Math.random()*1e9);const msg:ShotMessage={weapon:this.current,origin:{x:origin.x,y:origin.y,z:origin.z},direction:{x:direction.x,y:direction.y,z:direction.z},seed};this.network.shoot(msg);
    const muzzle=origin.clone().add(direction.clone().multiplyScalar(1.1));this.effects.muzzle(muzzle,c.color);this.player.shake(c.recoil);this.recoilKick+=c.recoil*1.5;this.sound(c);
    if(c.id==='rpg'){this.effects.rocket(muzzle,direction,!this.network.connected);this.refresh();if(this.ammo.get(this.current)===0)this.reload();return}
    const rays=c.pellets;for(let i=0;i<rays;i++){const d=direction.clone();d.x+=(Math.random()-.5)*c.spread;d.y+=(Math.random()-.5)*c.spread;d.z+=(Math.random()-.5)*c.spread;d.normalize();const hit=this.monsters.raycast(origin,d,c.range);if(hit)this.effects.impact(hit.point,hit.headshot?0xffe33d:0xff6842,c.id==='shotgun'?5:2,c.id==='shotgun'?6:3);if(i<Math.min(3,rays))this.tracer(muzzle,d,hit?.point??origin.clone().addScaledVector(d,c.range))}this.refresh();if(this.ammo.get(this.current)===0)this.reload();
  }
  private tracer(from:THREE.Vector3,dir:THREE.Vector3,to:THREE.Vector3){const length=Math.min(from.distanceTo(to),70);const g=new THREE.BufferGeometry().setFromPoints([from,from.clone().addScaledVector(dir,length)]);const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:this.config.color,transparent:true,opacity:.55}));this.camera.parent?.add(line);setTimeout(()=>{line.parent?.remove(line);g.dispose()},45)}
  private reload(){if(this.reloadLeft>0||(this.ammo.get(this.current)??0)>=this.config.magazine||(this.reserve.get(this.current)??0)<=0)return;this.reloadLeft=this.config.reload}
  private select(id:WeaponId){if(this.current===id)return;this.current=id;this.reloadLeft=0;this.cooldown=.2;this.buildModel();this.refresh()}
  private refresh(){this.hud.weapon(this.config,this.ammo.get(this.current)??0,this.reserve.get(this.current)??0,ORDER.indexOf(this.current),this.reloadLeft>0?1-this.reloadLeft/this.config.reload:0)}
  private aim(on:boolean){this.camera.fov=on?62:75;this.camera.updateProjectionMatrix()}
  private buildModel(){
    this.model.clear();this.reloadPart=undefined;
    const dark=new THREE.MeshStandardMaterial({color:0x171d20,roughness:.38,metalness:.65,flatShading:true}),metal=new THREE.MeshStandardMaterial({color:0x65727a,roughness:.3,metalness:.86,flatShading:true}),black=new THREE.MeshStandardMaterial({color:0x080b0d,roughness:.28,metalness:.78,flatShading:true}),wood=new THREE.MeshStandardMaterial({color:0x914f2a,roughness:.72,metalness:.04,flatShading:true}),olive=new THREE.MeshStandardMaterial({color:0x43533b,roughness:.58,metalness:.24,flatShading:true}),brass=new THREE.MeshStandardMaterial({color:0xb88a36,roughness:.25,metalness:.9,flatShading:true}),accent=new THREE.MeshStandardMaterial({color:this.config.color,emissive:this.config.color,emissiveIntensity:.42,roughness:.25,metalness:.42,flatShading:true});
    const addBox=(size:[number,number,number],pos:[number,number,number],material:THREE.Material=dark,rot:[number,number,number]=[0,0,0])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);m.rotation.set(...rot);this.model.add(m);return m};
    const addTube=(r:number,len:number,pos:[number,number,number],material:THREE.Material=metal,r2=r)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,len,10),material);m.rotation.x=Math.PI/2;m.position.set(...pos);this.model.add(m);return m};
    const addRing=(r:number,tube:number,z:number,material:THREE.Material=metal)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,5,12),material);m.position.z=z;this.model.add(m);return m};
    const addRail=(z:number,count:number,width=.16)=>{for(let i=0;i<count;i++)addBox([width,.025,.022],[0,.132,z-i*.047],black)};
    const addSight=(z:number,height=.11)=>{addBox([.055,height,.028],[0,.13+height*.5,z],black);addBox([.12,.025,.03],[0,.13+height,z],accent)};
    const addBolt=(x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.018,6,4),brass);m.position.set(x,y,z);this.model.add(m)};

    if(this.current==='rifle'){
      addBox([.24,.18,.42],[0,.01,-.18],metal);addBox([.205,.07,.48],[0,.13,-.23],dark);addBox([.19,.13,.24],[0,-.105,-.06],dark);addBox([.22,.16,.3],[0,-.01,.22],wood,[.05,0,0]);addBox([.15,.15,.18],[0,-.01,.43],wood,[.12,0,0]);
      addBox([.21,.15,.31],[0,.01,-.52],wood);for(const x of[-.085,.085])for(let i=0;i<4;i++)addBox([.018,.018,.045],[x,.085,-.43-i*.065],dark);
      addTube(.024,.49,[0,.055,-.91],black);addTube(.04,.11,[0,.055,-1.18],metal);for(const z of[-1.15,-1.19,-1.23])addRing(.043,.008,z,dark);addTube(.018,.42,[0,.125,-.82],dark);addSight(-1.03,.13);addSight(-.28,.075);addRail(-.23,7,.14);
      this.reloadPart=addBox([.17,.28,.13],[0,-.245,-.18],black,[-.19,0,0]);addBox([.13,.12,.12],[0,-.08,-.18],dark);addBox([.065,.17,.07],[0,-.19,.10],black,[-.18,0,0]);addBox([.018,.075,.13],[.125,.02,-.11],brass);addBolt(.127,.08,-.31);addBolt(.127,.02,-.31);
    }
    if(this.current==='smg'){
      addBox([.255,.22,.42],[0,.01,-.22],metal);addBox([.23,.075,.45],[0,.14,-.23],dark);addBox([.18,.12,.19],[0,-.11,-.02],black);addBox([.16,.16,.18],[0,.01,-.48],dark);addTube(.047,.39,[0,.035,-.75],black);for(const z of[-.59,-.68,-.77,-.86])addRing(.05,.007,z,metal);
      addRail(-.12,8,.19);addSight(-.54,.08);addBox([.02,.025,.31],[-.125,.02,-.22],accent);addBox([.08,.19,.08],[0,-.19,-.08],dark,[-.12,0,0]);this.reloadPart=addBox([.105,.32,.105],[0,-.29,-.22],black,[.05,0,0]);
      for(const x of[-.13,.13])addTube(.012,.39,[x,.02,.16],metal);addBox([.29,.04,.08],[0,.02,.36],dark);addBox([.04,.15,.11],[0,-.18,.12],black,[-.22,0,0]);addBolt(.132,.075,-.34);
    }
    if(this.current==='shotgun'){
      addBox([.24,.18,.32],[0,.01,-.12],metal);addBox([.25,.17,.37],[0,-.005,.23],wood,[.05,0,0]);addBox([.19,.15,.2],[0,-.005,.5],wood,[.14,0,0]);
      for(const x of[-.052,.052]){addTube(.041,.78,[x,.07,-.7],black);addRing(.043,.006,-1.09,metal)}addBox([.22,.16,.3],[0,-.01,-.51],wood);for(let i=0;i<5;i++)addBox([.225,.018,.018],[0,.07,-.41-i*.052],dark);
      addBox([.035,.08,.025],[0,.185,-1.03],accent);addBox([.11,.13,.09],[0,-.16,.06],dark,[-.18,0,0]);addBox([.022,.08,.14],[.135,.02,-.12],brass);for(let i=0;i<5;i++)addTube(.025,.085,[.15,.07,-.02-i*.066],i===0?accent:brass);this.reloadPart=addTube(.025,.085,[.15,.07,-.02],accent);
    }
    if(this.current==='minigun'){
      addBox([.31,.31,.38],[0,0,-.06],metal);addBox([.27,.23,.19],[0,.01,.22],dark);addTube(.13,.2,[0,.01,-.34],dark);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;addTube(.021,.78,[Math.cos(a)*.082,Math.sin(a)*.082,-.79],black)}for(const z of[-.43,-.72,-1.12])addRing(.12,.018,z,metal);
      addTube(.055,.9,[0,.01,-.78],dark);addBox([.38,.065,.24],[0,.235,-.04],dark);addBox([.045,.22,.07],[-.15,.13,.05],metal,[0,0,-.35]);addBox([.045,.22,.07],[.15,.13,.05],metal,[0,0,.35]);
      const drum=addTube(.155,.17,[.18,-.2,-.02],dark);drum.rotation.set(0,0,Math.PI/2);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;addBolt(.18+Math.cos(a)*.105,-.2+Math.sin(a)*.105,-.108)}this.reloadPart=drum;addBox([.09,.2,.09],[-.08,-.2,.11],black,[-.2,0,0]);addBox([.17,.035,.24],[-.16,-.05,-.14],accent);
    }
    if(this.current==='rpg'){
      addTube(.105,.88,[0,0,-.34],olive);addTube(.13,.13,[0,0,-.83],dark);addTube(.145,.18,[0,0,.17],dark,.105);for(const z of[-.69,-.05,.08])addRing(.11,.013,z,metal);addBox([.14,.24,.12],[0,-.2,-.16],dark,[-.14,0,0]);addBox([.11,.17,.1],[0,-.17,.1],olive,[-.12,0,0]);
      addBox([.045,.18,.035],[0,.19,-.42],dark);addBox([.12,.03,.04],[0,.28,-.42],accent);addBox([.045,.13,.035],[0,.165,.02],dark);addBox([.1,.03,.04],[0,.23,.02],black);addBox([.025,.11,.18],[.13,.03,-.28],brass);
      const rocket=new THREE.Mesh(new THREE.ConeGeometry(.092,.27,9),accent);rocket.rotation.x=-Math.PI/2;rocket.position.z=-1.035;this.model.add(rocket);for(const x of[-.095,.095])addBox([.018,.14,.17],[x,0,-.91],accent);for(const y of[-.095,.095])addBox([.14,.018,.17],[0,y,-.91],accent);this.reloadPart=rocket;
    }
    if(this.reloadPart)this.reloadPartBase.copy(this.reloadPart.position);
    const glove=new THREE.MeshStandardMaterial({color:0x303d35,roughness:.85,metalness:.03,flatShading:true}),sleeve=new THREE.MeshStandardMaterial({color:0x536052,roughness:.9,flatShading:true});
    const hand1=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.11,3,6),glove);hand1.rotation.z=Math.PI/2;hand1.position.set(.13,-.19,-.28);const hand2=hand1.clone();hand2.position.set(-.14,-.20,.07);const arm1=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.26,3,6),sleeve);arm1.rotation.set(Math.PI/2,0,-.35);arm1.position.set(.25,-.3,.03);const arm2=arm1.clone();arm2.rotation.z=.35;arm2.position.set(-.25,-.3,.25);this.model.add(hand1,hand2,arm1,arm2);
    this.model.scale.setScalar(.74);this.model.position.set(.31,-.29,-.94);this.model.rotation.set(-.03,-.22,0);this.refresh();
  }
  private sound(c:WeaponConfig){this.audio??=new AudioContext();if(this.audio.state==='suspended')this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain(),now=this.audio.currentTime;o.type=c.id==='rpg'?'sawtooth':'square';o.frequency.setValueAtTime(c.id==='shotgun'?105:c.id==='minigun'?180:150,now);o.frequency.exponentialRampToValueAtTime(45,now+.07);g.gain.setValueAtTime(c.id==='rpg'?.18:.055,now);g.gain.exponentialRampToValueAtTime(.001,now+(c.id==='rpg'?.28:.08));o.connect(g).connect(this.audio.destination);o.start();o.stop(now+(c.id==='rpg'?.3:.09))}
}
