import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { CombatEvent, PlayerSnapshot, WorldSnapshot } from '../../shared/protocol';
import { ChunkWorld } from '../world/ChunkWorld';
import { PlayerController } from '../player/PlayerController';
import { MonsterSystem } from '../monsters/MonsterSystem';
import { Effects } from '../effects/Effects';
import { Network } from '../network/Network';
import { WeaponSystem } from '../weapons/WeaponSystem';
import { HUD } from '../ui/HUD';
import { MAP_SIZE } from '../config';

export class Game {
  private renderer:THREE.WebGLRenderer;private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.08,1800);
  private physics!:RAPIER.World;private player!:PlayerController;private chunks!:ChunkWorld;private monsters!:MonsterSystem;private effects!:Effects;private weapons!:WeaponSystem;private network=new Network();private hud=new HUD();
  private remotes=new Map<string,{mesh:THREE.Group;target:THREE.Vector3;yaw:number}>();private clock=new THREE.Clock();private accumulator=0;private mapAccumulator=0;private started=false;private perfTime=0;private perfFrames=0;private quality=Math.min(devicePixelRatio,1);
  constructor(private canvas:HTMLCanvasElement){this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(this.quality);this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;addEventListener('resize',()=>this.resize())}
  async init(){
    await RAPIER.init();this.physics=new RAPIER.World({x:0,y:-24,z:0});this.physics.createCollider(RAPIER.ColliderDesc.cuboid(MAP_SIZE/2,.1,MAP_SIZE/2).setTranslation(0,-.1,0));
    this.scene.background=new THREE.Color(0x90c8b2);this.scene.fog=new THREE.FogExp2(0x90c8b2,.00115);
    const hemi=new THREE.HemisphereLight(0xc8ecff,0x3b5238,2.0);this.scene.add(hemi);const sun=new THREE.DirectionalLight(0xffe5b2,2.6);sun.position.set(-80,130,55);this.scene.add(sun);
    const sky=new THREE.Mesh(new THREE.SphereGeometry(1750,20,12),new THREE.MeshBasicMaterial({color:0x83bfb0,side:THREE.BackSide}));this.scene.add(sky);
    this.scene.add(this.camera);this.player=new PlayerController(this.camera,this.canvas,this.physics);this.chunks=new ChunkWorld(this.scene,this.physics);this.monsters=new MonsterSystem(this.scene);this.effects=new Effects(this.scene,this.camera);this.weapons=new WeaponSystem(this.camera,this.player,this.monsters,this.effects,this.network,this.hud);
    this.network.onSnapshot=s=>this.snapshot(s);this.network.onCombat=e=>this.combat(e);void this.network.connect();
    document.querySelector('#play')!.addEventListener('click',()=>this.start());this.canvas.addEventListener('click',()=>{if(this.started&&!this.player.locked)this.player.lock()});requestAnimationFrame(()=>this.loop());
  }
  private start(){this.started=true;this.hud.show();this.player.lock()}
  private loop(){requestAnimationFrame(()=>this.loop());const raw=this.clock.getDelta(),dt=Math.min(raw,.05),time=performance.now()/1000;if(this.started){this.player.update(dt);this.physics.step();this.scene.userData.playerPosition=this.player.position;this.chunks.update(this.player.position);this.monsters.update(dt,time);this.weapons.update(dt);this.effects.update(dt);this.hud.update(dt);this.updateRemotes(dt);this.mapAccumulator+=dt;if(this.mapAccumulator>.14){this.mapAccumulator=0;this.hud.minimap(this.player.position,this.player.yaw,this.monsters.getMapEntities(),[...this.remotes.values()].map(r=>r.target),this.chunks.getMarkers())}this.accumulator+=dt;if(this.accumulator>.05){this.accumulator=0;this.network.input({x:this.player.position.x,y:this.player.position.y,z:this.player.position.z,yaw:this.player.yaw,weapon:this.weapons.current})}const boss=this.monsters.boss;if(boss)this.hud.boss(boss.hp,boss.maxHp,boss.display.distanceTo(this.player.position));this.hud.health(this.player.hp)}this.renderer.render(this.scene,this.camera);this.perfTime+=raw;this.perfFrames++;if(this.perfTime>=1.5){const fps=this.perfFrames/this.perfTime;if(fps<48&&this.quality>.65)this.setQuality(this.quality-.1);else if(fps>58&&this.quality<1)this.setQuality(this.quality+.05);this.hud.performance(fps,this.renderer.info.render.calls,this.quality);this.perfTime=0;this.perfFrames=0}}
  private setQuality(value:number){this.quality=THREE.MathUtils.clamp(value,.65,1);this.renderer.setPixelRatio(this.quality);this.renderer.setSize(innerWidth,innerHeight,false)}
  private snapshot(s:WorldSnapshot){this.monsters.sync(s.monsters);this.hud.connection(this.network.connected,s.players.length);const present=new Set<string>();for(const p of s.players){if(p.id===this.network.id)continue;present.add(p.id);this.remote(p)}for(const [id,r]of this.remotes)if(!present.has(id)){this.scene.remove(r.mesh);this.remotes.delete(id)}}
  private remote(p:PlayerSnapshot){let r=this.remotes.get(p.id);if(!r){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.8,1.5,.55),new THREE.MeshLambertMaterial({color:0x4a89b8}));body.position.y=1.25;const head=new THREE.Mesh(new THREE.BoxGeometry(.55,.55,.55),new THREE.MeshLambertMaterial({color:0xd8a978}));head.position.y=2.25;const gun=new THREE.Mesh(new THREE.BoxGeometry(.15,.15,.9),new THREE.MeshLambertMaterial({color:0x222525}));gun.position.set(.38,1.55,-.35);g.add(body,head,gun);this.scene.add(g);r={mesh:g,target:new THREE.Vector3(),yaw:p.yaw};this.remotes.set(p.id,r)}r.target.set(p.x,p.y-1.2,p.z);r.yaw=p.yaw}
  private updateRemotes(dt:number){for(const r of this.remotes.values()){r.mesh.position.lerp(r.target,1-Math.exp(-10*dt));r.mesh.rotation.y=THREE.MathUtils.damp(r.mesh.rotation.y,r.yaw,8,dt)}}
  private combat(e:CombatEvent){
    if(e.type==='playerHit'&&e.targetId===this.network.id){this.player.applyDamage(e.damage??0);this.player.shake(.045)}
    if(e.type==='rocket'&&e.x!==undefined&&e.vx!==undefined&&e.targetId!==this.network.id)this.effects.rocketVelocity(new THREE.Vector3(e.x,e.y??0,e.z??0),new THREE.Vector3(e.vx,e.vy??0,e.vz??0));
    if(e.type==='explosion'&&e.x!==undefined){const p=new THREE.Vector3(e.x,e.y??0,e.z??0);this.effects.explosion(p);if(p.distanceTo(this.player.position)<28)this.player.shake(.13)}
    if((e.type==='hit'||e.type==='kill')&&e.monsterId!==undefined){const m=this.monsters.get(e.monsterId),p=m?.display.clone().add(new THREE.Vector3(0,2,0))??new THREE.Vector3(e.x,e.y,e.z);if(e.targetId===this.network.id){this.hud.hit(e.damage??0,!!e.headshot,p,this.camera);if(e.type==='kill')this.hud.kill()}if(e.type==='kill'){this.monsters.kill(e.monsterId);this.effects.impact(p,0x9bd64c,18,9)}}
  }
  private resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)}
}
