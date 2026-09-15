import * as THREE from 'three';
import type { ShotSpec } from '$lib/training/types';

// Metres. The origin is the centre of the net; +Z is the feeder's end and -Z is the player.
const TABLE = { width: 1.525, length: 2.74, height: 0.76, net: 0.1525 };
const BALL_RADIUS = 0.02;
const GRAVITY = 9.81;

type ActiveBall = {
	mesh: THREE.Group;
	velocity: THREE.Vector3;
	spin: THREE.Vector3;
	spec: ShotSpec;
	bounced: boolean;
	marker: THREE.Mesh;
	shadow: THREE.Mesh;
};

/** Player-eye table-tennis feed simulation with metre-scaled gravity, spin and table rebound. */
export class PracticeScene {
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(46, 1, 0.05, 30);
	private renderer: THREE.WebGLRenderer;
	private raf = 0;
	private last = performance.now();
	private active: ActiveBall[] = [];
	private opponent = new THREE.Group();
	private racket = new THREE.Group();
	private swing = 0;
	private disposed = false;

	constructor(private host: HTMLElement, private onContact: (s: ShotSpec) => void) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.15;
		this.host.appendChild(this.renderer.domElement);
		this.build();
		this.resize();
		this.loop();
	}

	private material(color: string, roughness = 0.62) {
		return new THREE.MeshStandardMaterial({ color, roughness });
	}

	private build() {
		this.scene.background = new THREE.Color('#071820');
		this.scene.fog = new THREE.FogExp2('#071820', 0.105);
		this.camera.position.set(0, 1.52, -3.18);
		this.camera.lookAt(0, 0.83, 0.35);

		const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), this.material('#14272b', 0.9));
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		this.scene.add(floor);

		const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE.width, 0.055, TABLE.length), this.material('#08717c', 0.43));
		top.position.y = TABLE.height;
		top.receiveShadow = top.castShadow = true;
		this.scene.add(top);
		const lineMaterial = new THREE.MeshBasicMaterial({ color: '#ecfffb' });
		const addLine = (w: number, l: number, x: number, z: number) => {
			const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, l), lineMaterial);
			line.position.set(x, TABLE.height + 0.031, z);
			this.scene.add(line);
		};
		addLine(TABLE.width, 0.018, 0, -TABLE.length / 2 + 0.015);
		addLine(TABLE.width, 0.018, 0, TABLE.length / 2 - 0.015);
		addLine(0.018, TABLE.length, -TABLE.width / 2 + 0.015, 0);
		addLine(0.018, TABLE.length, TABLE.width / 2 - 0.015, 0);
		addLine(0.012, TABLE.length, 0, 0);

		const net = new THREE.Mesh(
			new THREE.PlaneGeometry(TABLE.width, TABLE.net, 30, 5),
			new THREE.MeshStandardMaterial({ color: '#c8e2df', wireframe: true, transparent: true, opacity: 0.48, side: THREE.DoubleSide })
		);
		net.position.set(0, TABLE.height + TABLE.net / 2, 0);
		this.scene.add(net);
		addLine(TABLE.width + 0.08, 0.014, 0, 0);

		for (const x of [-0.62, 0.62]) for (const z of [-1.12, 1.12]) {
			const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), this.material('#17272c'));
			leg.position.set(x, 0.38, z);
			leg.castShadow = true;
			this.scene.add(leg);
		}

		this.buildOpponent();
		this.scene.add(new THREE.HemisphereLight('#bdeeff', '#071014', 1.65));
		const key = new THREE.DirectionalLight('#fff1d6', 3.2);
		key.position.set(-2.5, 5, -2);
		key.castShadow = true;
		key.shadow.mapSize.set(1024, 1024);
		this.scene.add(key);
		const rim = new THREE.PointLight('#55d7e8', 8, 5);
		rim.position.set(2, 2.5, 2.7);
		this.scene.add(rim);
	}

	private buildOpponent() {
		const shirt = this.material('#233e50', 0.75);
		const skin = this.material('#bb8264', 0.8);
		const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.52, 8, 16), shirt);
		body.position.y = 1.28;
		const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 16), skin);
		head.position.set(0, 1.79, -0.015);
		const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 6, 12), shirt);
		shoulders.rotation.z = Math.PI / 2;
		shoulders.position.y = 1.52;
		this.opponent.add(body, head, shoulders);

		// The hitting arm and racket sit camera-side and clear of the torso, so the contact cue is readable.
		const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 6, 12), skin);
		arm.rotation.z = -0.96;
		arm.position.set(0.34, 1.36, -0.1);
		this.opponent.add(arm);
		const rubber = new THREE.MeshStandardMaterial({ color: '#ed4938', roughness: 0.72, side: THREE.DoubleSide });
		const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.018, 32), rubber);
		blade.rotation.x = Math.PI / 2;
		const rim = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.009, 8, 32), this.material('#e5c08a'));
		const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.13, 6, 10), this.material('#b77539'));
		handle.position.y = -0.15;
		this.racket.add(blade, rim, handle);
		this.racket.position.set(0.51, 1.28, -0.22);
		this.opponent.add(this.racket);
		this.opponent.position.z = 1.72;
		this.scene.add(this.opponent);
	}

	prepare(s: ShotSpec) {
		this.racket.rotation.set(s.feed === 'backspin' ? 0.58 : s.feed === 'block' ? -0.08 : -0.25, -s.targetX * 0.35, -0.12);
		this.racket.position.x = 0.48 + s.targetX * 0.1;
	}

	feed(s: ShotSpec, showMarker: boolean) {
		const worldRacket = this.racket.getWorldPosition(new THREE.Vector3());
		const start = new THREE.Vector3(worldRacket.x, 1.03, 1.43);
		const target = new THREE.Vector3(s.targetX, TABLE.height + BALL_RADIUS, s.targetZ);
		// Solve the ballistic equation for a specified first-bounce time. At normal pace this creates
		// low, rally-scale net clearance rather than the high lob produced by an arbitrary arc.
		const t = s.duration;
		const velocity = target.clone().sub(start);
		velocity.x /= t;
		velocity.z /= t;
		velocity.y = (target.y - start.y + 0.5 * GRAVITY * t * t) / t;

		const ball = new THREE.Group();
		const shell = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 16), new THREE.MeshStandardMaterial({ color: '#fff4ca', roughness: 0.34, emissive: '#ffbf32', emissiveIntensity: 0.3 }));
		const seam = new THREE.Mesh(new THREE.TorusGeometry(BALL_RADIUS * 0.82, 0.0012, 5, 28), new THREE.MeshBasicMaterial({ color: '#e6a948' }));
		ball.add(shell, seam);
		ball.position.copy(start);
		shell.castShadow = true;

		const marker = new THREE.Mesh(new THREE.RingGeometry(0.052, 0.068, 32), new THREE.MeshBasicMaterial({ color: '#eaff5c', transparent: true, opacity: showMarker ? 0.68 : 0, side: THREE.DoubleSide }));
		marker.rotation.x = -Math.PI / 2;
		marker.position.copy(target);
		marker.position.y += 0.004;
		const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), new THREE.MeshBasicMaterial({ color: '#001014', transparent: true, opacity: 0.32, depthWrite: false }));
		shadow.rotation.x = -Math.PI / 2;
		shadow.position.set(start.x, TABLE.height + 0.034, start.z);
		this.scene.add(ball, marker, shadow);
		// With travel toward -Z, negative X rotation is topspin (downward Magnus force).
		const spinX = s.feed === 'backspin' ? 55 : s.feed === 'topspin' ? -75 : -18;
		this.active.push({ mesh: ball, marker, shadow, velocity, spin: new THREE.Vector3(spinX, 0, 0), spec: s, bounced: false });
		this.swing = 1;
	}

	private loop = () => {
		if (this.disposed) return;
		this.raf = requestAnimationFrame(this.loop);
		const now = performance.now();
		const dt = Math.min(0.02, (now - this.last) / 1000);
		this.last = now;
		this.swing = Math.max(0, this.swing - dt * 5.5);
		this.racket.position.z = -0.22 - Math.sin(this.swing * Math.PI) * 0.1;

		for (let i = this.active.length - 1; i >= 0; i--) {
			const b = this.active[i];
			// Gravity dominates a short table-tennis flight. Light quadratic drag keeps fast feeds believable;
			// Magnus lift from topspin/backspin subtly changes the shape without moving the intended bounce far.
			const speed = b.velocity.length();
			const acceleration = new THREE.Vector3(0, -GRAVITY, 0)
				.addScaledVector(b.velocity, -0.012 * speed)
				.addScaledVector(new THREE.Vector3().crossVectors(b.spin, b.velocity), 0.00011);
			b.velocity.addScaledVector(acceleration, dt);
			b.mesh.position.addScaledVector(b.velocity, dt);
			b.mesh.rotateX(b.spin.x * dt);

			const height = Math.max(0.001, b.mesh.position.y - TABLE.height);
			b.shadow.position.set(b.mesh.position.x, TABLE.height + 0.034, b.mesh.position.z);
			(b.shadow.material as THREE.MeshBasicMaterial).opacity = 0.28 * Math.max(0.12, 1 - height / 0.75);
			b.shadow.scale.setScalar(0.75 + Math.min(height, 0.7) * 0.7);

			if (!b.bounced && b.mesh.position.y <= TABLE.height + BALL_RADIUS && b.velocity.y < 0 && Math.abs(b.mesh.position.x) <= TABLE.width / 2 && Math.abs(b.mesh.position.z) <= TABLE.length / 2) {
				b.mesh.position.y = TABLE.height + BALL_RADIUS;
				b.bounced = true;
				// A hard table returns most vertical energy. Spin couples into forward speed: backspin checks,
				// while topspin shoots on lower and faster, matching the response a player reads in practice.
				b.velocity.y = Math.abs(b.velocity.y) * (b.spec.feed === 'backspin' ? 0.78 : 0.83);
				b.velocity.z *= b.spec.feed === 'backspin' ? 0.7 : b.spec.feed === 'topspin' ? 1.04 : 0.9;
				b.velocity.x *= 0.88;
				b.spin.multiplyScalar(0.82);
				this.onContact(b.spec);
			}
			if (b.mesh.position.z < -3.35 || b.mesh.position.y < 0) this.removeBall(i);
		}
		this.renderer.render(this.scene, this.camera);
	};

	private removeBall(index: number) {
		const b = this.active[index];
		this.scene.remove(b.mesh, b.marker, b.shadow);
		b.mesh.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.geometry.dispose();
				(object.material as THREE.Material).dispose();
			}
		});
		b.marker.geometry.dispose();
		(b.marker.material as THREE.Material).dispose();
		b.shadow.geometry.dispose();
		(b.shadow.material as THREE.Material).dispose();
		this.active.splice(index, 1);
	}

	resize = () => {
		const w = this.host.clientWidth;
		const h = this.host.clientHeight;
		this.camera.aspect = w / Math.max(h, 1);
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h, false);
	};

	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		while (this.active.length) this.removeBall(this.active.length - 1);
		this.scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.geometry.dispose();
				const material = object.material;
				Array.isArray(material) ? material.forEach((m) => m.dispose()) : material.dispose();
			}
		});
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}
}
