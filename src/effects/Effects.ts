import * as THREE from 'three';

interface Particle { mesh: THREE.Mesh; velocity: THREE.Vector3; life:number; max:number }
interface RocketVisual { group:THREE.Group; velocity:THREE.Vector3; life:number; trail:number; fallbackExplosion:boolean }
interface Blast { mesh:THREE.Mesh; life:number; max:number }
export class Effects {
  private particles:Particle[]=[]; private flashes:THREE.PointLight[]=[];private rockets:RocketVisual[]=[];private blasts:Blast[]=[];
  private particleGeo=new THREE.TetrahedronGeometry(.12); private pool:THREE.Mesh[]=[];
  constructor(private scene:THREE.Scene,private camera:THREE.Camera){}
  impact(position:THREE.Vector3,color=0xffdd88,count=5,power=3){for(let i=0;i<count;i++)this.spawn(position,color,power,.45)}
  rocket(position:THREE.Vector3,direction:THREE.Vector3,fallbackExplosion=false){const velocity=direction.clone().normalize().multiplyScalar(70);velocity.y+=4;this.rocketVelocity(position,velocity,fallbackExplosion)}
  rocketVelocity(position:THREE.Vector3,velocity:THREE.Vector3,fallbackExplosion=false){
    const group=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color:0x485542,roughness:.46,metalness:.48,flatShading:true}),bandMat=new THREE.MeshStandardMaterial({color:0xc7a64a,roughness:.3,metalness:.8,flatShading:true}),fireMat=new THREE.MeshBasicMaterial({color:0xff7b22,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.09,.075,.48,8),bodyMat);body.rotation.x=Math.PI/2;const nose=new THREE.Mesh(new THREE.ConeGeometry(.09,.2,8),bandMat);nose.rotation.x=-Math.PI/2;nose.position.z=-.34;const flame=new THREE.Mesh(new THREE.ConeGeometry(.085,.34,7),fireMat);flame.rotation.x=Math.PI/2;flame.position.z=.39;const band=new THREE.Mesh(new THREE.TorusGeometry(.092,.014,5,10),bandMat);band.position.z=-.05;group.add(body,nose,flame,band);group.position.copy(position);group.scale.setScalar(1.25);this.scene.add(group);this.rockets.push({group,velocity:velocity.clone(),life:4.7,trail:0,fallbackExplosion});
  }
  explosion(position:THREE.Vector3){
    for(let i=this.rockets.length-1;i>=0;i--)if(this.rockets[i].group.position.distanceTo(position)<28){this.scene.remove(this.rockets[i].group);this.rockets.splice(i,1)}
    const light=new THREE.PointLight(0xff641c,32,45,2);light.position.copy(position);this.scene.add(light);this.flashes.push(light);
    for(let i=0;i<55;i++)this.spawn(position,i%4===0?0x332e2c:(i%2?0xff5427:0xffc13d),5+Math.random()*13,.6+Math.random()*.8,.12+Math.random()*.28);
    const fireball=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:0xff9b31,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false}));fireball.position.copy(position);fireball.scale.setScalar(.25);this.scene.add(fireball);this.blasts.push({mesh:fireball,life:.42,max:.42});
    const ring=new THREE.Mesh(new THREE.RingGeometry(.5,1,32),new THREE.MeshBasicMaterial({color:0xffa42e,transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.position.copy(position);ring.rotation.x=-Math.PI/2;this.scene.add(ring);let t=0;const tick=()=>{t+=.04;ring.scale.setScalar(1+t*18);(ring.material as THREE.MeshBasicMaterial).opacity=1-t;if(t<1)requestAnimationFrame(tick);else this.scene.remove(ring)};tick();
  }
  muzzle(position:THREE.Vector3,color:number){const l=new THREE.PointLight(color,12,7);l.position.copy(position);this.scene.add(l);this.flashes.push(l);this.impact(position,color,3,1)}
  update(dt:number){
    for(let i=this.rockets.length-1;i>=0;i--){const r=this.rockets[i];r.life-=dt;r.trail-=dt;r.velocity.y-=6.5*dt;r.group.position.addScaledVector(r.velocity,dt);r.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),r.velocity.clone().normalize());const flame=r.group.children[2];flame.scale.setScalar(.72+Math.random()*.65);if(r.trail<=0){r.trail=.045;const tail=r.group.position.clone().add(r.velocity.clone().normalize().multiplyScalar(-.28));this.spawn(tail,Math.random()<.28?0xff7a21:0x3a3b38,.45,.65,.16+Math.random()*.09)}if(r.group.position.y<=.15||r.life<=0){const p=r.group.position.clone();this.scene.remove(r.group);this.rockets.splice(i,1);if(r.fallbackExplosion&&p.y<=.15){p.y=.18;this.explosion(p)}}}
    for(let i=this.blasts.length-1;i>=0;i--){const b=this.blasts[i];b.life-=dt;const t=1-b.life/b.max;b.mesh.scale.setScalar(.25+t*7);(b.mesh.material as THREE.MeshBasicMaterial).opacity=(1-t)*.92;if(b.life<=0){this.scene.remove(b.mesh);b.mesh.geometry.dispose();(b.mesh.material as THREE.Material).dispose();this.blasts.splice(i,1)}}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.velocity.y-=9*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*5;p.mesh.scale.setScalar(Math.max(.02,p.life/p.max));if(p.life<=0){this.scene.remove(p.mesh);this.pool.push(p.mesh);this.particles.splice(i,1)}}
    for(const l of this.flashes){l.intensity*=.55;if(l.intensity<.3){this.scene.remove(l);this.flashes.splice(this.flashes.indexOf(l),1)}}
  }
  private spawn(pos:THREE.Vector3,color:number,power:number,life:number,size=.12){const m=this.pool.pop()??new THREE.Mesh(this.particleGeo);m.material=new THREE.MeshBasicMaterial({color});m.position.copy(pos);m.scale.setScalar(size);this.scene.add(m);const v=new THREE.Vector3().randomDirection().multiplyScalar(power*(.4+Math.random()*.6));this.particles.push({mesh:m,velocity:v,life,max:life})}
}
