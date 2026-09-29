import * as THREE from 'three';
import type { MonsterKind, MonsterSnapshot } from '../../shared/protocol';

type Visual = MonsterSnapshot & { display:THREE.Vector3; target:THREE.Vector3; phase:number; lastSeen:number; facing:number; distance:number };
type PartRole='head'|'torso'|'armL'|'armR'|'legL'|'legR'|'detail';
interface RigPart { mesh:THREE.InstancedMesh; role:PartRole; offset:THREE.Vector3; rotation:THREE.Euler }
interface DeathPiece{mesh:THREE.Mesh;velocity:THREE.Vector3;spin:THREE.Vector3;life:number}
const KINDS:MonsterKind[]=['zombie','runner','tank','titan'];
const MAX:Record<MonsterKind,number>={zombie:360,runner:220,tank:120,titan:3};
const mat=(color:number,emissive=0)=>new THREE.MeshLambertMaterial({color,emissive,emissiveIntensity:emissive?1.4:0,flatShading:true});
const box=(x:number,y:number,z:number)=>new THREE.BoxGeometry(x,y,z);
const limb=(radius:number,length:number)=>new THREE.CapsuleGeometry(radius,length,3,6);

export class MonsterSystem {
  private entities=new Map<number,Visual>(); private rigs=new Map<MonsterKind,RigPart[]>();
  private instanceIds=new Map<THREE.InstancedMesh,number[]>();private headMeshes=new Set<THREE.InstancedMesh>();
  private root=new THREE.Object3D();private local=new THREE.Object3D();private final=new THREE.Matrix4();private frameAccumulator=0;private deathPieces:DeathPiece[]=[];private deathGeometry=new THREE.BoxGeometry(.45,.55,.35);
  constructor(private scene:THREE.Scene){
    this.rigs.set('zombie',this.makeRig('zombie',[
      [box(1.05,1.35,.62),mat(0x435b75),'torso',[0,1.8,0],[0,0,0]],[new THREE.DodecahedronGeometry(.48,0),mat(0x83b75d),'head',[0,2.82,0],[0,0,0]],
      [limb(.16,.86),mat(0x78aa55),'armL',[-.72,1.85,.05],[.28,0,.18]],[limb(.16,.86),mat(0x78aa55),'armR',[.72,1.85,.05],[.28,0,-.18]],
      [limb(.19,.72),mat(0x313b48),'legL',[-.28,.62,0],[0,0,0]],[limb(.19,.72),mat(0x313b48),'legR',[.28,.62,0],[0,0,0]],
      [box(.14,.12,.08),mat(0xffe65a,0xff5b00),'detail',[-.18,2.9,-.43],[0,0,0]],[box(.14,.12,.08),mat(0xffe65a,0xff5b00),'detail',[.18,2.9,-.43],[0,0,0]],
    ]));
    this.rigs.set('runner',this.makeRig('runner',[
      [new THREE.ConeGeometry(.58,1.7,5),mat(0xb43a2f),'torso',[0,1.42,0],[0,0,Math.PI]],[new THREE.OctahedronGeometry(.42,0),mat(0xf0a44f),'head',[0,2.48,-.18],[.2,0,0]],
      [limb(.12,.94),mat(0xdd7b3c),'armL',[-.58,1.55,-.22],[-.75,0,.28]],[limb(.12,.94),mat(0xdd7b3c),'armR',[.58,1.55,-.22],[-.75,0,-.28]],
      [limb(.13,.95),mat(0x4e252b),'legL',[-.23,.55,0],[0,0,0]],[limb(.13,.95),mat(0x4e252b),'legR',[.23,.55,0],[0,0,0]],[box(.34,.08,.06),mat(0xffffff,0xff2200),'detail',[0,2.53,-.37],[0,0,0]],
    ]));
    this.rigs.set('tank',this.makeRig('tank',[
      [new THREE.DodecahedronGeometry(1.15,0),mat(0x4f7358),'torso',[0,2.4,0],[0,0,0]],[new THREE.DodecahedronGeometry(.68,0),mat(0x6c925f),'head',[0,3.85,-.12],[0,0,0]],[box(.9,.35,.95),mat(0x4b4f52),'detail',[0,3.05,.05],[0,0,0]],
      [limb(.32,1.25),mat(0x587d59),'armL',[-1.35,2.25,0],[.12,0,.18]],[limb(.32,1.25),mat(0x587d59),'armR',[1.35,2.25,0],[.12,0,-.18]],
      [limb(.36,.95),mat(0x2d4034),'legL',[-.48,.72,0],[0,0,0]],[limb(.36,.95),mat(0x2d4034),'legR',[.48,.72,0],[0,0,0]],
      [new THREE.ConeGeometry(.18,.7,5),mat(0xd8c59b),'detail',[-.55,4.5,0],[0,0,.3]],[new THREE.ConeGeometry(.18,.7,5),mat(0xd8c59b),'detail',[.55,4.5,0],[0,0,-.3]],[box(.5,.13,.08),mat(0xff342d,0xff1000),'detail',[0,3.95,-.58],[0,0,0]],
    ]));
    this.rigs.set('titan',this.makeRig('titan',[
      [new THREE.DodecahedronGeometry(5.1,1),mat(0x5d2228),'torso',[0,10.2,0],[0,0,0]],[new THREE.OctahedronGeometry(3.2,1),mat(0x8e3430),'head',[0,16.4,-.8],[0,0,0]],[box(9,1.3,5.5),mat(0x25292d),'detail',[0,12.5,.2],[0,0,0]],
      [limb(1.45,7),mat(0x6d292a),'armL',[-6.2,9.6,0],[.1,0,.12]],[limb(1.45,7),mat(0x6d292a),'armR',[6.2,9.6,0],[.1,0,-.12]],
      [limb(1.6,5.8),mat(0x30252a),'legL',[-2.1,3.4,0],[0,0,0]],[limb(1.6,5.8),mat(0x30252a),'legR',[2.1,3.4,0],[0,0,0]],
      [new THREE.ConeGeometry(.8,3.5,5),mat(0xcfc5a2),'detail',[-2.1,19.5,0],[0,0,.35]],[new THREE.ConeGeometry(.8,3.5,5),mat(0xcfc5a2),'detail',[2.1,19.5,0],[0,0,-.35]],[box(2.8,.5,.22),mat(0xff261f,0xff0000),'detail',[0,16.6,-3],[0,0,0]],
    ]));
  }
  private makeRig(kind:MonsterKind,defs:Array<[THREE.BufferGeometry,THREE.Material,PartRole,[number,number,number],[number,number,number]]>){return defs.map(([geometry,material,role,pos,rot])=>{const mesh=new THREE.InstancedMesh(geometry,material,MAX[kind]);mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);this.instanceIds.set(mesh,[]);if(role==='head')this.headMeshes.add(mesh);return{mesh,role,offset:new THREE.Vector3(...pos),rotation:new THREE.Euler(...rot)}})}
  sync(list:MonsterSnapshot[]){const now=performance.now();for(const m of list){const old=this.entities.get(m.id);if(old){old.target.set(m.x,m.y,m.z);old.hp=m.hp;old.maxHp=m.maxHp;old.vx=m.vx;old.vz=m.vz;old.lastSeen=now}else this.entities.set(m.id,{...m,display:new THREE.Vector3(m.x,m.y,m.z),target:new THREE.Vector3(m.x,m.y,m.z),phase:Math.random()*10,lastSeen:now,facing:0,distance:0})}}
  update(dt:number,time:number){this.updateDeathPieces(dt);this.frameAccumulator+=dt;if(this.frameAccumulator<1/40)return;const step=this.frameAccumulator;this.frameAccumulator=0;const now=performance.now(),player=this.scene.userData.playerPosition as THREE.Vector3|undefined;for(const [id,e]of this.entities){if(now-e.lastSeen>1400){this.entities.delete(id);continue}e.display.lerp(e.target,1-Math.exp(-7*step));e.distance=player?e.display.distanceTo(player):0;if(Math.abs(e.vx)+Math.abs(e.vz)>.02)e.facing=angleDamp(e.facing,Math.atan2(e.vx,e.vz),7,step)}for(const kind of KINDS){const members=[...this.entities.values()].filter(e=>e.kind===kind).slice(0,MAX[kind]);for(const part of this.rigs.get(kind)!){const visible=kind==='titan'||part.role==='head'||part.role==='torso'?members:members.filter(e=>e.distance<(part.role==='detail'?140:240));const ids=this.instanceIds.get(part.mesh)!;ids.length=0;for(let i=0;i<visible.length;i++){const e=visible[i],speed=Math.hypot(e.vx,e.vz),stride=Math.sin(time*(kind==='runner'?8:kind==='titan'?2.2:5)+e.phase)*Math.min(1,speed*.45);this.root.position.copy(e.display);this.root.rotation.set(0,e.facing,0);this.root.updateMatrix();this.local.position.copy(part.offset);this.local.rotation.copy(part.rotation);if(part.role==='armL'||part.role==='legR')this.local.rotation.x+=stride*.55;if(part.role==='armR'||part.role==='legL')this.local.rotation.x-=stride*.55;if(part.role==='torso')this.local.rotation.z+=Math.sin(time*3+e.phase)*.025;this.local.updateMatrix();this.final.multiplyMatrices(this.root.matrix,this.local.matrix);part.mesh.setMatrixAt(i,this.final);ids[i]=e.id}part.mesh.count=visible.length;part.mesh.instanceMatrix.needsUpdate=true}}}
  raycast(origin:THREE.Vector3,direction:THREE.Vector3,range:number){const hits=new THREE.Raycaster(origin,direction,0,range).intersectObjects([...this.instanceIds.keys()],false);if(!hits.length)return null;const hit=hits[0],mesh=hit.object as THREE.InstancedMesh,id=this.instanceIds.get(mesh)?.[hit.instanceId??-1];if(id===undefined)return null;const entity=this.entities.get(id);if(!entity)return null;return{id,point:hit.point.clone(),headshot:this.headMeshes.has(mesh),kind:entity.kind}}
  kill(id:number){const entity=this.entities.get(id);if(!entity)return;this.entities.delete(id);const colors:Record<MonsterKind,number>={zombie:0x73a856,runner:0xd75a35,tank:0x4f7358,titan:0x7d292d},size=entity.kind==='titan'?4:entity.kind==='tank'?1.5:1;const material=new THREE.MeshLambertMaterial({color:colors[entity.kind],flatShading:true});const count=entity.kind==='titan'?18:entity.kind==='tank'?10:7;for(let i=0;i<count;i++){const mesh=new THREE.Mesh(this.deathGeometry,material);mesh.position.copy(entity.display).add(new THREE.Vector3((Math.random()-.5)*size,Math.random()*size*2.6+.3,(Math.random()-.5)*size));mesh.scale.setScalar(size*(.65+Math.random()*.8));this.scene.add(mesh);const direction=new THREE.Vector3(Math.random()-.5,.35+Math.random(),Math.random()-.5).normalize();this.deathPieces.push({mesh,velocity:direction.multiplyScalar(3+Math.random()*7+size),spin:new THREE.Vector3().randomDirection().multiplyScalar(4+Math.random()*6),life:1.4+Math.random()*.9})}while(this.deathPieces.length>180){const old=this.deathPieces.shift()!;this.scene.remove(old.mesh)}}
  getMapEntities(){return[...this.entities.values()].map(e=>({x:e.display.x,z:e.display.z,kind:e.kind}))}
  private updateDeathPieces(dt:number){for(let i=this.deathPieces.length-1;i>=0;i--){const p=this.deathPieces[i];p.life-=dt;p.velocity.y-=16*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=p.spin.x*dt;p.mesh.rotation.y+=p.spin.y*dt;p.mesh.rotation.z+=p.spin.z*dt;if(p.mesh.position.y<.18){p.mesh.position.y=.18;p.velocity.y=Math.abs(p.velocity.y)*.28;p.velocity.x*=.78;p.velocity.z*=.78}if(p.life<.45)p.mesh.scale.multiplyScalar(Math.max(.78,1-dt*3));if(p.life<=0){this.scene.remove(p.mesh);this.deathPieces.splice(i,1)}}}
  get(id:number){return this.entities.get(id)}
  get boss(){for(const e of this.entities.values())if(e.kind==='titan')return e;return undefined}
}
function angleDamp(current:number,target:number,lambda:number,dt:number){let delta=(target-current+Math.PI)%(Math.PI*2)-Math.PI;if(delta<-Math.PI)delta+=Math.PI*2;return current+delta*(1-Math.exp(-lambda*dt))}
