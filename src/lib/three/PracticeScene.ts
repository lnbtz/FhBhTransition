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
	private hittingArm = new THREE.Group();
	private racket = new THREE.Group();
	private armPose = new THREE.Euler();
	private racketPose = new THREE.Euler();
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
		const shirt = this.material('#24566d', 0.68);
		const shirtDark = this.material('#163442', 0.76);
		const accent = new THREE.MeshStandardMaterial({ color: '#dfff46', roughness: 0.52, emissive: '#7f990f', emissiveIntensity: 0.12 });
		const skin = this.material('#bd8064', 0.82);
		const hair = this.material('#172126', 0.9);
		const shorts = this.material('#101c25', 0.86);
		const socks = this.material('#d6d9d2', 0.9);
		const shoes = this.material('#d9ff4d', 0.7);
		const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#101719' });

		const limbBetween = (a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) => {
			const direction = b.clone().sub(a);
			const mesh = new THREE.Mesh(
				new THREE.CapsuleGeometry(radius, Math.max(0.01, direction.length() - radius * 2), 8, 16),
				material
			);
			mesh.position.copy(a).add(b).multiplyScalar(0.5);
			mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
			return mesh;
		};

		// A tapered, slightly forward-leaning torso reads much more like an athlete than a vertical capsule.
		const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.175, 0.52, 24), shirt);
		torso.position.set(0, 1.32, 0.015);
		torso.rotation.x = -0.08;
		const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.19, 0.12, 20), shirtDark);
		waist.position.set(0, 1.05, 0.035);
		const shortsBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.205, 0.22, 20), shorts);
		shortsBody.position.set(0, 0.93, 0.04);
		this.opponent.add(torso, waist, shortsBody);

		const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.008), accent);
		chestStripe.position.set(-0.025, 1.38, -0.2);
		chestStripe.rotation.z = -0.24;
		const collar = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.009, 7, 24), shirtDark);
		collar.position.set(0, 1.565, -0.105);
		collar.scale.y = 0.55;
		this.opponent.add(chestStripe, collar);

		// Head, neck and a few restrained facial details keep the low-poly style without looking faceless.
		const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 0.13, 16), skin);
		neck.position.set(0, 1.62, 0.005);
		const head = new THREE.Mesh(new THREE.SphereGeometry(0.142, 28, 20), skin);
		head.position.set(0, 1.76, -0.015);
		head.scale.set(0.94, 1.08, 0.96);
		const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.146, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
		hairCap.position.set(0, 1.775, -0.01);
		const nose = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 8), skin);
		nose.position.set(0, 1.745, -0.15);
		const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), skin);
		leftEar.position.set(-0.137, 1.76, -0.014);
		const rightEar = leftEar.clone();
		rightEar.position.x = 0.137;
		const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), eyeMaterial);
		leftEye.position.set(-0.046, 1.787, -0.144);
		const rightEye = leftEye.clone();
		rightEye.position.x = 0.046;
		const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.047, 0.006, 0.006), eyeMaterial);
		mouth.position.set(0, 1.69, -0.145);
		this.opponent.add(neck, head, hairCap, nose, leftEar, rightEar, leftEye, rightEye, mouth);

		// Crouched legs and offset knees give the player a believable ready stance behind the table.
		const leftHip = new THREE.Vector3(-0.105, 0.93, 0.04);
		const rightHip = new THREE.Vector3(0.105, 0.93, 0.04);
		const leftKnee = new THREE.Vector3(-0.245, 0.59, -0.015);
		const rightKnee = new THREE.Vector3(0.245, 0.59, -0.015);
		const leftAnkle = new THREE.Vector3(-0.29, 0.2, 0.065);
		const rightAnkle = new THREE.Vector3(0.29, 0.2, 0.065);
		this.opponent.add(
			limbBetween(leftHip, leftKnee, 0.075, skin),
			limbBetween(rightHip, rightKnee, 0.075, skin),
			limbBetween(leftKnee, leftAnkle, 0.059, skin),
			limbBetween(rightKnee, rightAnkle, 0.059, skin)
		);
		for (const x of [-0.29, 0.29]) {
			const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.058, 0.13, 14), socks);
			sock.position.set(x, 0.14, 0.065);
			const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.25), shoes);
			shoe.position.set(x, 0.055, -0.015);
			shoe.rotation.y = x < 0 ? 0.08 : -0.08;
			this.opponent.add(sock, shoe);
		}

		// The free arm is bent in front of the body for balance instead of hanging as a single stick.
		const freeShoulder = new THREE.Vector3(-0.205, 1.48, -0.01);
		const freeSleeve = new THREE.Vector3(-0.285, 1.39, -0.07);
		const freeElbow = new THREE.Vector3(-0.35, 1.26, -0.145);
		const freeHand = new THREE.Vector3(-0.19, 1.17, -0.245);
		this.opponent.add(
			limbBetween(freeShoulder, freeSleeve, 0.073, shirt),
			limbBetween(freeSleeve, freeElbow, 0.049, skin),
			limbBetween(freeElbow, freeHand, 0.043, skin)
		);
		const balanceHand = new THREE.Mesh(new THREE.SphereGeometry(0.051, 16, 12), skin);
		balanceHand.position.copy(freeHand);
		balanceHand.scale.set(1.15, 0.8, 0.65);
		this.opponent.add(balanceHand);

		// The hitting arm is a connected shoulder/elbow/wrist chain. The whole chain rotates through contact.
		this.hittingArm.position.set(0.205, 1.48, -0.01);
		const armOrigin = new THREE.Vector3(0, 0, 0);
		const sleeveEnd = new THREE.Vector3(0.085, -0.09, -0.04);
		const elbow = new THREE.Vector3(0.195, -0.22, -0.105);
		const hand = new THREE.Vector3(0.355, -0.32, -0.22);
		this.hittingArm.add(
			limbBetween(armOrigin, sleeveEnd, 0.073, shirt),
			limbBetween(sleeveEnd, elbow, 0.049, skin),
			limbBetween(elbow, hand, 0.043, skin)
		);
		const hittingHand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), skin);
		hittingHand.position.copy(hand);
		hittingHand.scale.set(1.1, 0.82, 0.7);
		this.hittingArm.add(hittingHand);

		// Layered blade: visible wood edge, two rubbers, handle core and grip inlays.
		const wood = this.material('#d5a05f', 0.67);
		const lightWood = this.material('#e5bf82', 0.62);
		const redRubber = this.material('#d92f35', 0.54);
		const blackRubber = this.material('#171b1c', 0.5);
		const bladeCore = new THREE.Mesh(new THREE.CylinderGeometry(0.113, 0.113, 0.014, 40), wood);
		bladeCore.rotation.x = Math.PI / 2;
		bladeCore.scale.z = 1.08;
		const redFace = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.004, 40), redRubber);
		redFace.rotation.x = Math.PI / 2;
		redFace.scale.z = 1.08;
		redFace.position.z = -0.009;
		const blackFace = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.004, 40), blackRubber);
		blackFace.rotation.x = Math.PI / 2;
		blackFace.scale.z = 1.08;
		blackFace.position.z = 0.009;
		const bladeRim = new THREE.Mesh(new THREE.TorusGeometry(0.113, 0.006, 8, 40), lightWood);
		bladeRim.scale.y = 1.08;
		const handleCore = new THREE.Mesh(new THREE.CapsuleGeometry(0.027, 0.13, 7, 14), wood);
		handleCore.position.y = -0.17;
		const handleFront = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.145, 0.014), lightWood);
		handleFront.position.set(0, -0.17, -0.025);
		const handleStripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.006), shirtDark);
		handleStripe.position.set(0, -0.17, -0.034);
		const rubberMark = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), lightWood);
		rubberMark.position.set(0, 0.025, -0.012);
		this.racket.add(bladeCore, redFace, blackFace, bladeRim, handleCore, handleFront, handleStripe, rubberMark);
		this.racket.position.set(0.355, -0.18, -0.245);
		this.racket.rotation.set(-0.08, 0, -0.08);
		this.racketPose.copy(this.racket.rotation);
		this.hittingArm.add(this.racket);
		this.opponent.add(this.hittingArm);

		this.opponent.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.castShadow = true;
				object.receiveShadow = true;
			}
		});
		this.opponent.position.z = 1.72;
		this.scene.add(this.opponent);
	}

	prepare(s: ShotSpec) {
		this.armPose.set(
			s.feed === 'backspin' ? 0.16 : s.feed === 'block' ? -0.035 : -0.08,
			-s.targetX * 0.16,
			s.feed === 'backspin' ? 0.1 : -0.035
		);
		this.racketPose.set(
			s.feed === 'backspin' ? 0.38 : s.feed === 'block' ? -0.08 : -0.2,
			-s.targetX * 0.22,
			-0.08
		);
		this.hittingArm.rotation.copy(this.armPose);
		this.racket.rotation.copy(this.racketPose);
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
		const stroke = Math.sin(this.swing * Math.PI);
		this.hittingArm.rotation.set(
			this.armPose.x - stroke * 0.2,
			this.armPose.y + stroke * 0.045,
			this.armPose.z - stroke * 0.16
		);
		this.racket.rotation.set(
			this.racketPose.x + stroke * 0.07,
			this.racketPose.y,
			this.racketPose.z - stroke * 0.04
		);

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
