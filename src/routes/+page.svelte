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
		intervalRange: { min: number; max: number };
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
		intervalRange: { min: 900, max: 1400 },
		targetMode: 'randomAngles',
		startPosition: 'left'
	};

	const angleRange = { min: 8, max: 18 };
	const speedClamp = { min: 5.2, max: 8.4 };
	const speedJitter = { min: 0.92, max: 1.08 };
	const landingAngleOffsets: Record<LandingKey, number> = {
		wideLeft: -10,
		leftCorner: -7,
		midLeft: -4,
		middle: 0,
		midRight: 4,
		rightCorner: 7,
		wideRight: 10
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

	const alternatingTargets = makeAlternatingPicker<{ key: LandingKey; spot: THREE.Vector3 }>([
		{ key: 'midLeft', spot: landingSpots.midLeft },
		{ key: 'midRight', spot: landingSpots.midRight }
	]);
	const originOrder: OriginKey[] = ['left', 'middle', 'right'];
	let originIndex = 0;

	type OriginKey = keyof typeof robotOrigins;

	function pickLanding(originKey: OriginKey): { key: LandingKey; spot: THREE.Vector3 } {
		if (settings.targetMode === 'alternateFH') {
			return alternatingTargets();
		}
		const options = (Object.entries(landingSpots) as [LandingKey, THREE.Vector3][]).filter(([key]) => {
			if (originKey === 'right' && key === 'wideRight') return false;
			if (originKey === 'left' && key === 'wideLeft') return false;
			return true;
		});
		const [key, spot] = options[Math.floor(Math.random() * options.length)];
		return { key, spot };
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

	type PaddleInstance = { group: THREE.Group; face: THREE.Mesh; sponge: THREE.Mesh };

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let rafId = 0;
	let clock: THREE.Clock;
	let balls: BallState[] = [];
	let lastFlightDuration = 0;
	let ballCount = 0;
	let isRunning = false;
	let nextSpawnMs = 0;
	let paddles: Partial<Record<OriginKey, PaddleInstance>> = {};
	let upcomingShot: { originKey: OriginKey; landing: { key: LandingKey; spot: THREE.Vector3 } } | null =
		null;
	const basePaddleScale = 1.5;

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

		createPaddles();
	}

	function resizeRenderer() {
		if (!container || !renderer || !camera) return;
		const { clientWidth, clientHeight } = container;
		renderer.setSize(clientWidth, clientHeight);
		camera.aspect = clientWidth / clientHeight;
		camera.updateProjectionMatrix();
	}

	const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

	function colorsForAngle(offset: number) {
		const base = new THREE.Color(0xc1121f);
		const hsl = { h: 0, s: 0, l: 0 };
		base.getHSL(hsl);
		const norm = THREE.MathUtils.clamp(offset / 10, -1, 1);
		const light = THREE.MathUtils.clamp(hsl.l + norm * 0.06, 0.2, 0.8);
		const face = new THREE.Color().setHSL(hsl.h, hsl.s, light);
		const sponge = new THREE.Color().setHSL(hsl.h, hsl.s * 0.95, Math.max(light - 0.04, 0.15));
		return { face, sponge };
	}

	function createPaddle(): PaddleInstance {
		const group = new THREE.Group();

		const faceMaterial = new THREE.MeshPhongMaterial({ color: 0xc1121f, shininess: 80 });
		const spongeMaterial = new THREE.MeshPhongMaterial({ color: 0x91131f, shininess: 40 });
		const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x7a5230, shininess: 30 });

		const face = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.014, 32), faceMaterial);
		face.rotation.x = Math.PI / 2;
		face.castShadow = true;
		face.receiveShadow = true;

		const sponge = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.006, 32), spongeMaterial);
		sponge.rotation.x = Math.PI / 2;
		sponge.position.y = 0.008;

		const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.18, 20), handleMaterial);
		handle.position.y = -0.12;
		handle.castShadow = true;
		handle.receiveShadow = true;

		group.add(face);
		group.add(sponge);
		group.add(handle);
		group.position.set(0, table.height + 0.32, table.length / 2 + 0.25);
		group.rotation.set(-0.3, 0, 0);
		group.visible = false;
		group.scale.setScalar(basePaddleScale);

		return { group, face, sponge };
	}

	function createPaddles() {
		paddles = {};
		(['left', 'middle', 'right'] as OriginKey[]).forEach((key) => {
			const paddle = createPaddle();
			paddles[key] = paddle;
			scene.add(paddle.group);
		});
	}

	function disposePaddles() {
		Object.values(paddles).forEach((paddle) => {
			if (!paddle) return;
			scene.remove(paddle.group);
			paddle.group.traverse((child) => {
				if ((child as THREE.Mesh).isMesh) {
					const mesh = child as THREE.Mesh;
					(mesh.geometry as THREE.BufferGeometry).dispose();
					if (Array.isArray(mesh.material)) {
						mesh.material.forEach((mat) => (mat as THREE.Material).dispose());
					} else {
						(mesh.material as THREE.Material).dispose();
					}
				}
			});
		});
		paddles = {};
	}

	function normalizedIntervalRange() {
		const lower = Math.min(settings.intervalRange.min, settings.intervalRange.max);
		const upper = Math.max(settings.intervalRange.min, settings.intervalRange.max);
		const min = Math.max(200, lower);
		const max = Math.max(min, upper);
		return { min, max };
	}

	function scheduleNextSpawn(nowMs: number) {
		const { min, max } = normalizedIntervalRange();
		nextSpawnMs = nowMs + randomBetween(min, max);
	}

	function planNextShot(): { originKey: OriginKey; landing: { key: LandingKey; spot: THREE.Vector3 } } {
		const originKey = nextOriginKey();
		const landing = pickLanding(originKey);
		return { originKey, landing };
	}

	function previewNextShot() {
		if (!upcomingShot) {
			upcomingShot = planNextShot();
		}
		orientPaddle(upcomingShot.originKey, upcomingShot.landing);
	}

	function orientPaddle(originKey: OriginKey, landing: { key: LandingKey; spot: THREE.Vector3 }) {
		Object.values(paddles).forEach((p) => p && (p.group.visible = false));
		const paddle = paddles[originKey];
		if (!paddle) return;

		const origin = robotOrigins[originKey];
		paddle.group.visible = true;
		paddle.group.position.copy(origin).add(new THREE.Vector3(0, -0.02, 0.05));

		const dir = new THREE.Vector3(landing.spot.x - origin.x, 0, landing.spot.z - origin.z);
		const baseYaw = Math.atan2(dir.x, dir.z);
		const yawOffsetDeg = landingAngleOffsets[landing.key] ?? 0;
		const yaw = baseYaw + THREE.MathUtils.degToRad(yawOffsetDeg);
		paddle.group.rotation.set(-0.35, yaw, 0);

		const { face, sponge } = colorsForAngle(yawOffsetDeg);
		(paddle.face.material as THREE.MeshPhongMaterial).color.copy(face);
		(paddle.sponge.material as THREE.MeshPhongMaterial).color.copy(sponge);

		const magnitude = Math.min(Math.abs(yawOffsetDeg) / 10, 1);
		const stretch = 1 + magnitude * 0.25;
		const squash = 1 - magnitude * 0.15;
		const xScale = yawOffsetDeg >= 0 ? stretch : squash;
		const zScale = yawOffsetDeg >= 0 ? squash : stretch;
		paddle.group.scale.set(basePaddleScale * xScale, basePaddleScale, basePaddleScale * zScale);
	}

	function solveSpeedForTarget(
		start: THREE.Vector3,
		aim: THREE.Vector3,
		angleDeg: number,
		radius: number,
		gravity: number
	): number | null {
		const angle = THREE.MathUtils.degToRad(angleDeg);
		const horizontalDir = new THREE.Vector3(aim.x - start.x, 0, aim.z - start.z);
		const horizontalDistance = horizontalDir.length();
		if (horizontalDistance < 0.05) return null;

		const surfaceY = table.height + radius;
		const deltaY = surfaceY - start.y;
		const cos = Math.cos(angle);
		if (cos < 1e-3) return null;

		const denom = 2 * cos * cos * (deltaY - horizontalDistance * Math.tan(angle));
		if (denom === 0) return null;

		const speedSquared = (gravity * horizontalDistance * horizontalDistance) / denom;
		if (speedSquared <= 0 || !Number.isFinite(speedSquared)) return null;
		return Math.sqrt(speedSquared);
	}

	function pickLaunch(origin: THREE.Vector3, landing: THREE.Vector3) {
		const angleDeg = randomBetween(angleRange.min, angleRange.max);
		const baseSpeed = solveSpeedForTarget(origin, landing, angleDeg, 0.02, -9);
		const speed =
			baseSpeed === null
				? randomBetween(speedClamp.min, speedClamp.max)
				: THREE.MathUtils.clamp(
						baseSpeed * randomBetween(speedJitter.min, speedJitter.max),
						speedClamp.min,
						speedClamp.max
				  );

		return { angleDeg, speed };
	}

	function nextOriginKey(): OriginKey {
		if (settings.startPosition === 'alternate') {
			const key = originOrder[originIndex % originOrder.length];
			originIndex += 1;
			return key;
		}
		return settings.startPosition;
	}

	function spawnBall(nowSeconds: number) {
		const shot = upcomingShot ?? planNextShot();
		upcomingShot = null;

		const origin = robotOrigins[shot.originKey];
		orientPaddle(shot.originKey, shot.landing);
		const { angleDeg, speed } = pickLaunch(origin, shot.landing.spot);
		const { velocity, flightTime } = computeTrajectory(
			origin.clone(),
			shot.landing.spot,
			-9,
			angleDeg,
			speed,
			0.02
		);
		lastFlightDuration = flightTime;

		// Land on/near the table, bounce, then continue toward the player/camera.
		const radius = 0.02;
		const restitution = THREE.MathUtils.clamp(0.35 + angleDeg / 90, 0.25, 0.65);
		const ball = createBallFromVelocity({
			start: origin.clone(),
			velocity,
			radius,
			gravity: -9,
			restitution
		});

		scene.add(ball.mesh);
		balls.push(ball);
		ballCount += 1;
	}

	function animate() {
		const delta = clock.getDelta();
		const nowSeconds = clock.elapsedTime;
		const nowMs = nowSeconds * 1000;

		if (nowMs >= nextSpawnMs) {
			spawnBall(nowSeconds);
			scheduleNextSpawn(nowMs);
		}

		balls = balls.filter((ball) => {
			const { alive, passedCamera } = stepBall(ball, delta, table.height, camera.position.z);
			if (passedCamera) {
				previewNextShot();
			}
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
		if (isRunning) return;
		stop();
		clock = new THREE.Clock();
		setupScene();
		window.addEventListener('resize', resizeRenderer);
		clock.start();
		nextSpawnMs = 0; // force an immediate first ball
		lastFlightDuration = 0;
		ballCount = 0;
		originIndex = 0;
		upcomingShot = null;
		isRunning = true;
		animate();
	}

	function stop() {
		cancelAnimationFrame(rafId);
		window.removeEventListener('resize', resizeRenderer);
		clock?.stop();
		renderer?.dispose();
		balls.forEach((ball) => {
			scene.remove(ball.mesh);
			(ball.mesh.geometry as THREE.BufferGeometry).dispose();
			(ball.mesh.material as THREE.Material).dispose();
		});
		balls = [];
		disposePaddles();
		container?.firstChild && container.removeChild(container.firstChild);
		isRunning = false;
		nextSpawnMs = 0;
		upcomingShot = null;
	}

	onMount(() => {
		return () => stop();
	});
</script>

<div class="page">
	<div class="controls">
		<div class="header">
			<div>
				<h1>Table Tennis Robot</h1>
				<p class="note">
					Ball delay randomizes between the interval range; speed and angle still auto-adjust to keep
					shots on the table. Current flight duration (derived): {lastFlightDuration.toFixed(2)}s
				</p>
			</div>
			<div class="actions">
				<button class="start" on:click={start} disabled={isRunning}>Start</button>
				<button class="stop" on:click={stop} disabled={!isRunning}>Stop</button>
				<div class="counter">
					<span>Balls launched</span>
					<strong>{ballCount}</strong>
				</div>
			</div>
		</div>
		<div class="row">
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
				<span>Drill</span>
				<select bind:value={settings.targetMode}>
					<option value="randomAngles">Random all table</option>
					<option value="alternateFH">1 - 1</option>
				</select>
			</label>
			<label class="interval">
				<span>Interval range (ms)</span>
				<div class="interval-inputs">
					<input
						type="number"
						min="200"
						step="50"
						bind:value={settings.intervalRange.min}
						disabled={isRunning}
					/>
					<span class="dash">–</span>
					<input
						type="number"
						min="200"
						step="50"
						bind:value={settings.intervalRange.max}
						disabled={isRunning}
					/>
				</div>
				<small class="hint">Delay between balls randomizes within this range.</small>
			</label>
		</div>
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

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	h1 {
		margin: 0 0 6px;
		font-size: 18px;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	button {
		border: none;
		border-radius: 10px;
		padding: 10px 14px;
		color: #0b1221;
		font-weight: 600;
		cursor: pointer;
		transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	button.start {
		background: linear-gradient(135deg, #22c55e, #16a34a);
		box-shadow: 0 10px 30px rgba(22, 163, 74, 0.35);
	}

	button.stop {
		background: linear-gradient(135deg, #f97316, #ea580c);
		box-shadow: 0 10px 30px rgba(234, 88, 12, 0.35);
		color: #0b1221;
	}

	button:not(:disabled):hover {
		transform: translateY(-1px);
	}

	.counter {
		display: grid;
		padding: 8px 12px;
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid rgba(226, 232, 240, 0.12);
		border-radius: 10px;
		min-width: 120px;
	}

	.counter span {
		font-size: 12px;
		color: #cbd5e1;
	}

	.counter strong {
		font-size: 20px;
		color: #e2e8f0;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 12px;
		align-items: center;
		margin-top: 10px;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
	}

	select {
		background: #0f172a;
		border: 1px solid rgba(226, 232, 240, 0.14);
		color: #e2e8f0;
		padding: 8px 10px;
		border-radius: 8px;
	}

	input[type='number'] {
		background: #0f172a;
		border: 1px solid rgba(226, 232, 240, 0.14);
		color: #e2e8f0;
		padding: 8px 10px;
		border-radius: 8px;
	}

	.note {
		margin: 0;
		color: #cbd5e1;
		font-size: 13px;
		max-width: 520px;
	}

	.interval-inputs {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 8px;
	}

	.interval-inputs .dash {
		color: #94a3b8;
		text-align: center;
	}

	.hint {
		color: #94a3b8;
		font-size: 12px;
	}

	.viewport {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
