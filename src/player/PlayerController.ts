import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MAP_SIZE } from '../config';

export class PlayerController {
  readonly position = new THREE.Vector3(0, 2, 15);
  readonly velocity = new THREE.Vector3();
  yaw = Math.PI; pitch = 0; hp = 100; locked = false;
  private keys = new Set<string>();private jumpBuffer=0;private coyoteTime=.12;private grounded=true;private bob=0;
  private body: RAPIER.RigidBody; private collider: RAPIER.Collider; private controller: RAPIER.KinematicCharacterController;
  private head = 1.55;

  constructor(public camera: THREE.PerspectiveCamera, private canvas: HTMLCanvasElement, world: RAPIER.World) {
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,2,15));
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(.7,.42),this.body);
    this.controller = world.createCharacterController(.02); this.controller.enableAutostep(.4,.2,true); this.controller.enableSnapToGround(.25);
    addEventListener('keydown',e=>{this.keys.add(e.code);if(e.code==='Space'){e.preventDefault();this.jumpBuffer=.16}});
    addEventListener('keyup',e=>this.keys.delete(e.code));
    addEventListener('mousemove',e=>{if(!this.locked)return;this.yaw-=e.movementX*.0018;this.pitch=Math.max(-1.5,Math.min(1.5,this.pitch-e.movementY*.0018))});
    document.addEventListener('pointerlockchange',()=>this.locked=document.pointerLockElement===canvas);
  }
  lock(){this.canvas.requestPointerLock()}
  update(dt:number){
    const sprint=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'); const speed=sprint?19:10;
    const ix=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0); const iz=(this.keys.has('KeyS')?1:0)-(this.keys.has('KeyW')?1:0);
    const input=new THREE.Vector3(ix,0,iz); if(input.lengthSq()>0)input.normalize(); input.applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
    this.velocity.x=THREE.MathUtils.damp(this.velocity.x,input.x*speed,14,dt); this.velocity.z=THREE.MathUtils.damp(this.velocity.z,input.z*speed,14,dt);
    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyoteTime=Math.max(0,this.coyoteTime-dt);if(this.jumpBuffer>0&&(this.grounded||this.coyoteTime>0)){this.velocity.y=10.2;this.grounded=false;this.coyoteTime=0;this.jumpBuffer=0;this.controller.disableSnapToGround()}this.velocity.y-=24*dt;
    const desired={x:this.velocity.x*dt,y:this.velocity.y*dt,z:this.velocity.z*dt}; this.controller.computeColliderMovement(this.collider,desired);
    const move=this.controller.computedMovement(); const current=this.body.translation(); this.body.setNextKinematicTranslation({x:current.x+move.x,y:current.y+move.y,z:current.z+move.z});
    this.position.set(current.x+move.x,current.y+move.y,current.z+move.z);const contactGround=this.controller.computedGrounded();if(contactGround&&this.velocity.y<=0){this.velocity.y=0;this.grounded=true;this.coyoteTime=.12;this.controller.enableSnapToGround(.25)}else this.grounded=false;if(this.position.y<1.2){this.position.y=1.2;this.velocity.y=0;this.grounded=true;this.coyoteTime=.12;this.controller.enableSnapToGround(.25)}
    const edge=MAP_SIZE/2-6;this.position.x=THREE.MathUtils.clamp(this.position.x,-edge,edge);this.position.z=THREE.MathUtils.clamp(this.position.z,-edge,edge);
    const moving=input.lengthSq()>0&&this.grounded;if(moving)this.bob+=dt*(sprint?13:9);const vertical=moving?Math.abs(Math.sin(this.bob))*(sprint?.075:.055):0,side=moving?Math.cos(this.bob*.5)*(sprint?.04:.026):0,roll=moving?Math.sin(this.bob*.5)*(sprint?.018:.011):0,rightX=Math.cos(this.yaw),rightZ=-Math.sin(this.yaw);
    this.camera.position.set(this.position.x+rightX*side,this.position.y+this.head+vertical,this.position.z+rightZ*side);this.camera.rotation.set(this.pitch,this.yaw,roll,'YXZ');
    this.camera.fov=THREE.MathUtils.damp(this.camera.fov,sprint&&moving?82:75,8,dt);this.camera.updateProjectionMatrix();
  }
  applyDamage(amount:number){this.hp=Math.max(0,this.hp-amount);if(this.hp<=0){this.hp=100;this.position.set(0,2,15);this.body.setNextKinematicTranslation({x:0,y:2,z:15})}}
  shake(amount:number){this.pitch+= (Math.random()-.5)*amount;this.yaw+=(Math.random()-.5)*amount}
}
