import * as THREE from 'three';

export type BallState = {
	mesh: THREE.Mesh;
	velocity: THREE.Vector3;
	radius: number;
	gravity: number;
	restitution: number;
	bounced: boolean;
};

export function createBallMesh(radius: number): THREE.Mesh {
	const geometry = new THREE.SphereGeometry(radius, 32, 16);
	const material = new THREE.MeshPhongMaterial({ color: 0xfefefe });
	const mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	return mesh;
}

export function createBallFromVelocity(params: {
	start: THREE.Vector3;
	velocity: THREE.Vector3;
	radius: number;
	gravity?: number;
	restitution?: number;
}): BallState {
	const { start, velocity, radius, gravity = -9.8, restitution = 0.5 } = params;
	const mesh = createBallMesh(radius);
	mesh.position.copy(start);
	return {
		mesh,
		velocity: velocity.clone(),
		radius,
		gravity,
		restitution,
		bounced: false
	};
}

/**
 * Creates a ball with an initial velocity chosen to hit the target point
 * (at table height) after `duration` seconds under constant gravity.
 * This gives a natural arc that lands on the table, bounces, and then
 * keeps moving toward the player/camera.
 */
export function createBall(params: {
	start: THREE.Vector3;
	target: THREE.Vector3; // expected bounce point on the table (y should be table height + radius)
	duration: number;
	radius: number;
	gravity?: number;
	restitution?: number;
	loft?: number; // extra upward velocity (m/s) to control peak height
}): BallState {
	const { start, target, duration, radius, gravity = -9.8, restitution = 0.6, loft = 0 } = params;

	// Solve for initial velocity: x(t) = x0 + vx * t, z(t) = z0 + vz * t,
	// y(t) = y0 + vy * t + 0.5 * g * t^2; rearrange for v.
	const accel = new THREE.Vector3(0, gravity, 0);
	const displacement = target.clone().sub(start).sub(accel.clone().multiplyScalar(0.5 * duration * duration));
	const velocity = displacement.clone().divideScalar(duration);
	velocity.y += loft; // upward boost to control arc height

	const mesh = createBallMesh(radius);
	mesh.position.copy(start);

	return {
		mesh,
		velocity,
		radius,
		gravity,
		restitution,
		bounced: false
	};
}

/**
 * Advance the ball by dt seconds, apply gravity, and bounce on the table surface.
 * Returns whether the ball should keep existing.
 */
export function stepBall(ball: BallState, dt: number, tableHeight: number, cameraZ: number): boolean {
	// Apply gravity to vertical velocity.
	ball.velocity.y += ball.gravity * dt;

	// Predict next position.
	const nextPos = ball.mesh.position.clone().addScaledVector(ball.velocity, dt);
	const surfaceY = tableHeight + ball.radius;

	// Detect bounce with the table plane.
	if (nextPos.y <= surfaceY && ball.velocity.y < 0) {
		nextPos.y = surfaceY;
		ball.velocity.y = -ball.velocity.y * ball.restitution;
		ball.bounced = true;
	}

	ball.mesh.position.copy(nextPos);

	// Culling: once the ball passes the camera (toward negative z) or drifts far away, drop it.
	const behindCamera = ball.mesh.position.z < cameraZ - 0.3;
	const tooFar = ball.mesh.position.length() > 30;
	return !(behindCamera || tooFar);
}
