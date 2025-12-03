<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { createTableWithNet, type TableDimensions } from '$lib/three/table';
	import { createBallFromVelocity, stepBall, type BallState } from '$lib/three/ball';

	let container: HTMLDivElement;

	// 1 unit = 1 meter. Origin is the center of the table surface.
	// x: left (-) to right (+) from the player's view; y: up; z: player is negative, robot is positive.
	const table: TableDimensions = {
		length: 2.74,
		width: 1.525,
		height: 0.76,
		netHeight: 0.1525
	};

	type Settings = {
		intervalMs: number;
		launchAngleDeg: number; // elevation of the shot in degrees
		ballSpeed: number; // initial speed magnitude in m/s
		targetMode: 'alternateFH' | 'randomAngles';
		startPosition: 'left' | 'middle' | 'right' | 'alternate';
	};

	const robotOrigins = {
		left: new THREE.Vector3(-0.45, table.height + 0.3, table.length / 2 + 0.2),
		middle: new THREE.Vector3(0, table.height + 0.32, table.length / 2 + 0.15),
		right: new THREE.Vector3(0.45, table.height + 0.3, table.length / 2 + 0.2)
	};

	type LandingKey =
		| 'wideLeft'
		| 'leftCorner'
		| 'midLeft'
		| 'middle'
		| 'midRight'
		| 'rightCorner'
		| 'wideRight';

	const landingSpots: Record<LandingKey, THREE.Vector3> = {
		wideLeft: new THREE.Vector3(-(table.width / 2 + 0.18), table.height + 0.02, -table.length / 2 + 0.35),
		leftCorner: new THREE.Vector3(-(table.width / 2 - 0.05), table.height + 0.02, -table.length / 2 + 0.18),
		midLeft: new THREE.Vector3(-0.35, table.height + 0.02, -table.length / 2 + 0.28),
		middle: new THREE.Vector3(0, table.height + 0.02, -table.length / 2 + 0.32),
		midRight: new THREE.Vector3(0.35, table.height + 0.02, -table.length / 2 + 0.28),
		rightCorner: new THREE.Vector3(table.width / 2 - 0.05, table.height + 0.02, -table.length / 2 + 0.18),
		wideRight: new THREE.Vector3(table.width / 2 + 0.18, table.height + 0.02, -table.length / 2 + 0.35)
	};

	let settings: Settings = {
		intervalMs: 1200,
		launchAngleDeg: 12,
		ballSpeed: 6,
		targetMode: 'randomAngles',
		startPosition: 'left'
	};

	type Picker<T> = () => T;
	const makeAlternatingPicker = <T,>(items: T[]): Picker<T> => {
		let index = 0;
		return () => {
			const item = items[index % items.length];
			index += 1;
			return item;
		};
	};

	const alternatingTargets = makeAlternatingPicker([
		landingSpots.midLeft,
		landingSpots.midRight
	]);
	const originPicker = makeAlternatingPicker([
		robotOrigins.left,
		robotOrigins.middle,
		robotOrigins.right
	]);

	type OriginKey = keyof typeof robotOrigins;

	function landingOptionsForOrigin(originKey: OriginKey): THREE.Vector3[] {
		// Rule-of-thumb: don't send extreme wide balls from the same-side origin to keep angles believable.
		return Object.entries(landingSpots)
			.filter(([key]) => {
				if (originKey === 'right' && key === 'wideRight') return false;
				if (originKey === 'left' && key === 'wideLeft') return false;
				return true;
			})
			.map(([, spot]) => spot);
	}

	function pickLanding(originKey: OriginKey): THREE.Vector3 {
		if (settings.targetMode === 'alternateFH') {
			return alternatingTargets();
		}
		const options = landingOptionsForOrigin(originKey);
		return options[Math.floor(Math.random() * options.length)];
	}

	function computeTrajectory(
		start: THREE.Vector3,
		aim: THREE.Vector3,
		gravity: number,
		angleDeg: number,
		speed: number,
		radius: number
	): { velocity: THREE.Vector3; flightTime: number; landingPoint: THREE.Vector3 } {
		const angle = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(angleDeg, 2, 30));
		const surfaceY = table.height + radius;

		// Horizontal direction toward the aim point; depth comes from physics (speed + angle).
		const dir = new THREE.Vector3(aim.x - start.x, 0, aim.z - start.z);
		if (dir.lengthSq() === 0) dir.set(0, 0, -1);
		dir.normalize();

		const g = gravity; // negative
		const vHor = speed * Math.cos(angle);
		const vY = speed * Math.sin(angle);
		const velocity = dir.clone().multiplyScalar(vHor).add(new THREE.Vector3(0, vY, 0));

		// Solve y(t) = surfaceY for time-of-flight: 0.5*g*t^2 + vY*t + (startY - surfaceY) = 0
		const a = 0.5 * g;
		const b = vY;
		const c = start.y - surfaceY;
		const discriminant = Math.max(0, b * b - 4 * a * c);
		const sqrtDisc = Math.sqrt(discriminant);
		const t1 = (-b + sqrtDisc) / (2 * a);
		const t2 = (-b - sqrtDisc) / (2 * a);
		const flightTime = Math.max(t1, t2, 0.0001);

		// Horizontal travel during flight.
		const horizontalTravel = vHor * flightTime;
		let landingPoint = start.clone().addScaledVector(dir, horizontalTravel).setY(surfaceY);

		// Keep landing within/just beyond the table bounds.
		const maxX = table.width / 2 + 0.05;
		const minX = -maxX;
		const minZ = -table.length / 2 - 0.05;
		const maxZ = table.length / 2 + 0.05;
		landingPoint.x = THREE.MathUtils.clamp(landingPoint.x, minX, maxX);
		landingPoint.z = THREE.MathUtils.clamp(landingPoint.z, minZ, maxZ);

		return { velocity, flightTime, landingPoint };
	}

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let rafId = 0;
	let lastSpawnMs = 0;
	const clock = new THREE.Clock();
	let balls: BallState[] = [];
	let lastFlightDuration = 0;

	function setupScene() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0b1221);

		// Camera from the player's perspective looking down the table.
		const nearZ = -table.length / 2 - 1.2;
		camera = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
		camera.position.set(0, table.height + 0.7, nearZ);
		camera.lookAt(0, table.height, table.length / 2);

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		resizeRenderer();
		renderer.shadowMap.enabled = true;
		container.appendChild(renderer.domElement);

		const tableGroup = createTableWithNet(table);
		scene.add(tableGroup);

		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10),
			new THREE.MeshPhongMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
		);
		floor.rotation.x = -Math.PI / 2;
		scene.add(floor);

		const ambient = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambient);

		const directional = new THREE.DirectionalLight(0xffffff, 1.1);
		directional.position.set(-2, 3, -3);
		directional.castShadow = true;
		scene.add(directional);

		const fill = new THREE.PointLight(0x8cf3ff, 0.4);
		fill.position.set(0, 2.4, 1.2);
		scene.add(fill);
	}

	function resizeRenderer() {
		if (!container || !renderer || !camera) return;
		const { clientWidth, clientHeight } = container;
		renderer.setSize(clientWidth, clientHeight);
		camera.aspect = clientWidth / clientHeight;
		camera.updateProjectionMatrix();
	}

	function spawnBall(nowSeconds: number) {
		const originKey: OriginKey =
			settings.startPosition === 'alternate'
				? (['left', 'middle', 'right'][Math.floor(Math.random() * 3)] as OriginKey)
				: settings.startPosition;
		const origin = settings.startPosition === 'alternate' ? originPicker() : robotOrigins[originKey];

		const landing = pickLanding(originKey);
		const { velocity, flightTime, landingPoint } = computeTrajectory(
			origin.clone(),
			landing,
			-9,
			settings.launchAngleDeg,
			settings.ballSpeed,
			0.02
		);
		lastFlightDuration = flightTime;

		// Land on/near the table, bounce, then continue toward the player/camera.
		const radius = 0.02;
		const restitution = THREE.MathUtils.clamp(0.35 + settings.launchAngleDeg / 90, 0.25, 0.65);
		const ball = createBallFromVelocity({
			start: origin.clone(),
			velocity,
			radius,
			gravity: -9,
			restitution
		});

		scene.add(ball.mesh);
		balls.push(ball);
	}

	function animate() {
		const delta = clock.getDelta();
		const nowSeconds = clock.elapsedTime;
		const nowMs = nowSeconds * 1000;

		if (nowMs - lastSpawnMs >= settings.intervalMs) {
			spawnBall(nowSeconds);
			lastSpawnMs = nowMs;
		}

		balls = balls.filter((ball) => {
			const alive = stepBall(ball, delta, table.height, camera.position.z);
			if (!alive) {
				scene.remove(ball.mesh);
				(ball.mesh.geometry as THREE.BufferGeometry).dispose();
				(ball.mesh.material as THREE.Material).dispose();
			}
			return alive;
		});

		renderer.render(scene, camera);
		rafId = requestAnimationFrame(animate);
	}

	function start() {
		setupScene();
		window.addEventListener('resize', resizeRenderer);
		clock.start();
		lastSpawnMs = -settings.intervalMs; // force an immediate first ball
		animate();
	}

	function stop() {
		cancelAnimationFrame(rafId);
		window.removeEventListener('resize', resizeRenderer);
		renderer?.dispose();
		balls.forEach((ball) => {
			scene.remove(ball.mesh);
			(ball.mesh.geometry as THREE.BufferGeometry).dispose();
			(ball.mesh.material as THREE.Material).dispose();
		});
		balls = [];
		container?.firstChild && container.removeChild(container.firstChild);
	}

	onMount(() => {
		start();
		return () => stop();
	});
</script>

<div class="page">
	<div class="controls">
		<h1>Table Tennis Robot</h1>
		<div class="row">
			<label>
				<span>Interval (ms)</span>
				<input type="number" min="200" step="50" bind:value={settings.intervalMs} />
			</label>
			<label>
				<span>Launch angle (deg)</span>
				<input type="number" min="2" max="30" step="0.5" bind:value={settings.launchAngleDeg} />
			</label>
			<label>
				<span>Ball speed (m/s)</span>
				<input type="number" min="1" step="0.1" bind:value={settings.ballSpeed} />
			</label>
			<label>
				<span>Start position</span>
				<select bind:value={settings.startPosition}>
					<option value="left">Left</option>
					<option value="middle">Middle</option>
					<option value="right">Right</option>
					<option value="alternate">Alternate L/M/R</option>
				</select>
			</label>
			<label>
				<span>Targets</span>
				<select bind:value={settings.targetMode}>
					<option value="randomAngles">Random angles (7 pts)</option>
					<option value="alternateFH">Alternate FH / BH</option>
				</select>
			</label>
		</div>
		<p class="note">
			Origin is table center; x: left/right, z: depth (player is -z), y: up. Launch angle + speed set
			the arc: higher angle/low speed drops near the net; low angle/high speed skims lower and reaches
			deeper. Balls land on the table, bounce with energy loss, and pass the camera before being culled.
			<br />
			Current flight duration (derived): {lastFlightDuration.toFixed(2)}s
		</p>
	</div>
	<div class="viewport" bind:this={container}></div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600&display=swap');

	:global(body) {
		margin: 0;
		background: #0b1221;
		color: #e2e8f0;
		font-family: 'Sora', 'Inter', system-ui, -apple-system, sans-serif;
	}

	.page {
		display: grid;
		grid-template-rows: auto 1fr;
		min-height: 100vh;
	}

	.controls {
		padding: 16px;
		background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
		border-bottom: 1px solid rgba(226, 232, 240, 0.08);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(6px);
	}

	h1 {
		margin: 0 0 12px;
		font-size: 18px;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		align-items: center;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
	}

	label input[type='number'] {
		background: #0f172a;
		border: 1px solid rgba(226, 232, 240, 0.14);
		color: #e2e8f0;
		padding: 8px 10px;
		border-radius: 8px;
	}

	select {
		background: #0f172a;
		border: 1px solid rgba(226, 232, 240, 0.14);
		color: #e2e8f0;
		padding: 8px 10px;
		border-radius: 8px;
	}

	.note {
		margin: 12px 0 0;
		color: #cbd5e1;
		font-size: 13px;
	}

	.viewport {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
