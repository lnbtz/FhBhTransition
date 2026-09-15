import * as THREE from 'three';
import type { ShotSpec } from '$lib/training/types';

const D={width:1.525,length:2.74,height:.76,net:.1525};
type Active={mesh:THREE.Mesh, velocity:THREE.Vector3, spec:ShotSpec, bounced:boolean, marker:THREE.Mesh};

/** Stable visual simulation: ballistic flight to one constrained tabletop target, then a stylised spin-dependent bounce. */
export class PracticeScene {
	private scene=new THREE.Scene(); private camera=new THREE.PerspectiveCamera(48,1,.05,30);
	private renderer:THREE.WebGLRenderer; private raf=0; private last=performance.now(); private active:Active[]=[];
	private opponent=new THREE.Group(); private racket=new THREE.Group(); private disposed=false;
	constructor(private host:HTMLElement, private onContact:(s:ShotSpec)=>void){
		this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.shadowMap.enabled=true;
		this.renderer.shadowMap.type=THREE.PCFSoftShadowMap; this.renderer.outputColorSpace=THREE.SRGBColorSpace;
		this.host.appendChild(this.renderer.domElement); this.build(); this.resize(); this.loop();
	}
	private build(){
		this.scene.background=new THREE.Color('#07131b'); this.scene.fog=new THREE.Fog('#07131b',6,12);
		this.camera.position.set(0,1.58,-3.35); this.camera.lookAt(0,.82,.38);
		const floor=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshStandardMaterial({color:'#101d22',roughness:.9})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; this.scene.add(floor);
		const top=new THREE.Mesh(new THREE.BoxGeometry(D.width,.055,D.length),new THREE.MeshStandardMaterial({color:'#075e68',roughness:.48,metalness:.08})); top.position.y=D.height; top.receiveShadow=true; top.castShadow=true; this.scene.add(top);
		const white=new THREE.MeshBasicMaterial({color:'#d9f3ef'}); const addLine=(w:number,l:number,x:number,z:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.006,l),white);m.position.set(x,D.height+.031,z);this.scene.add(m)};
		addLine(D.width,.018,0,-D.length/2+.015); addLine(D.width,.018,0,D.length/2-.015); addLine(.018,D.length,-D.width/2+.015,0); addLine(.018,D.length,D.width/2-.015,0); addLine(.012,D.length,0,0);
		const net=new THREE.Mesh(new THREE.PlaneGeometry(D.width,D.net,24,4),new THREE.MeshStandardMaterial({color:'#102b30',wireframe:true,transparent:true,opacity:.8,side:THREE.DoubleSide})); net.position.set(0,D.height+D.net/2,0); this.scene.add(net); addLine(D.width+.08,.016,0,0);
		for(const x of [-.62,.62]) for(const z of [-1.12,1.12]) {const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,.72,.06),new THREE.MeshStandardMaterial({color:'#17242a'})); leg.position.set(x,.38,z); leg.castShadow=true;this.scene.add(leg)}
		// Readable, stylised opponent and cue racket.
		const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.55,6,12),new THREE.MeshStandardMaterial({color:'#172f3e'})); body.position.y=1.28; this.opponent.add(body);
		const head=new THREE.Mesh(new THREE.SphereGeometry(.13,20,12),new THREE.MeshStandardMaterial({color:'#b98769'}));head.position.y=1.78;this.opponent.add(head);
		const blade=new THREE.Mesh(new THREE.CylinderGeometry(.115,.115,.018,24),new THREE.MeshStandardMaterial({color:'#f25a40'})); blade.rotation.x=Math.PI/2; const handle=new THREE.Mesh(new THREE.BoxGeometry(.045,.17,.035),new THREE.MeshStandardMaterial({color:'#b87636'}));handle.position.y=-.16;this.racket.add(blade,handle);this.racket.position.set(.35,1.25,-.12);this.opponent.add(this.racket);this.opponent.position.z=1.72;this.scene.add(this.opponent);
		this.scene.add(new THREE.HemisphereLight('#b8ecff','#081116',1.5)); const sun=new THREE.DirectionalLight('#fff4dc',3);sun.position.set(-2.5,5,-2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);this.scene.add(sun);
	}
	prepare(s:ShotSpec){
		const yaw=-s.targetX*.85; this.racket.rotation.set(s.feed==='backspin' ? .9 : s.feed==='block' ? -.12 : -.48,yaw,s.feed==='backspin' ? -.45:.1);
		this.racket.position.x=.2+s.targetX*.18;
	}
	feed(s:ShotSpec, showMarker:boolean){
		const start=new THREE.Vector3(this.racket.getWorldPosition(new THREE.Vector3()).x,1.23,1.3); const target=new THREE.Vector3(s.targetX,D.height+.02,s.targetZ);
		const g=-9.81,t=s.duration; const v=target.clone().sub(start);v.x/=t;v.z/=t;v.y=(target.y-start.y-.5*g*t*t)/t;
		const mesh=new THREE.Mesh(new THREE.SphereGeometry(.02,18,12),new THREE.MeshStandardMaterial({color:'#fff7b2',emissive:'#ffd84d',emissiveIntensity:1.2}));mesh.position.copy(start);mesh.castShadow=true;
		const marker=new THREE.Mesh(new THREE.RingGeometry(.055,.072,28),new THREE.MeshBasicMaterial({color:'#ffdb57',transparent:true,opacity:showMarker?.75:0,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.copy(target);marker.position.y+=.004;
		this.scene.add(mesh,marker);this.active.push({mesh,marker,velocity:v,spec:s,bounced:false});
	}
	private loop=()=>{if(this.disposed)return;this.raf=requestAnimationFrame(this.loop);const now=performance.now(),dt=Math.min(.025,(now-this.last)/1000);this.last=now;
		for(let i=this.active.length-1;i>=0;i--){const b=this.active[i];b.velocity.y-=9.81*dt;b.mesh.position.addScaledVector(b.velocity,dt);
			if(!b.bounced&&b.mesh.position.y<=D.height+.02&&b.velocity.y<0&&Math.abs(b.mesh.position.x)<=D.width/2&&Math.abs(b.mesh.position.z)<=D.length/2){b.mesh.position.y=D.height+.02;b.bounced=true;b.velocity.y=Math.abs(b.velocity.y)*(b.spec.feed==='backspin'?.62:.5);b.velocity.z*=b.spec.feed==='backspin'?.68:b.spec.feed==='block'?1.12:.94;this.onContact(b.spec);}
			if(b.mesh.position.z<-2.4||b.mesh.position.y<0){this.scene.remove(b.mesh,b.marker);b.mesh.geometry.dispose();(b.mesh.material as THREE.Material).dispose();this.active.splice(i,1)}}
		this.renderer.render(this.scene,this.camera)};
	resize=()=>{const w=this.host.clientWidth,h=this.host.clientHeight;this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false)};
	dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.active.forEach(b=>this.scene.remove(b.mesh,b.marker));this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;Array.isArray(m)?m.forEach(x=>x.dispose()):m.dispose()}});this.renderer.dispose();this.renderer.domElement.remove()}
}
