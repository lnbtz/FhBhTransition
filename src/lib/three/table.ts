import * as THREE from 'three';

export type TableDimensions = {
	length: number; // along z-axis (player at negative z, robot at positive z)
	width: number; // along x-axis (negative x = backhand side, positive x = forehand side)
	height: number; // playing surface height
	netHeight: number;
	netThickness?: number;
};

const TABLE_THICKNESS = 0.02; // simple slab thickness

/**
 * Builds a simplified 3D table tennis table and net.
 * Coordinate system (Svelte page matches this):
 * - origin: table center on the playing surface
 * - x: left (-) to right (+) from the player's view
 * - y: vertical (up is +)
 * - z: player (near) is -, robot (far) is +
 */
export function createTableWithNet(dimensions: TableDimensions): THREE.Group {
	const group = new THREE.Group();

	const { width, length, height, netHeight, netThickness = 0.02 } = dimensions;

	// Table top
	const tableGeometry = new THREE.BoxGeometry(width, TABLE_THICKNESS, length);
	const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x0b6fa4 });
	const table = new THREE.Mesh(tableGeometry, tableMaterial);
	table.position.y = height - TABLE_THICKNESS / 2;
	table.receiveShadow = true;
	group.add(table);

	// White border lines
	const lineMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
	const lineThickness = 0.005;
	const lineHeight = 0.002;
	const longLineGeometry = new THREE.BoxGeometry(width + lineThickness * 2, lineHeight, lineThickness);
	const shortLineGeometry = new THREE.BoxGeometry(lineThickness, lineHeight, length);

	const frontLine = new THREE.Mesh(longLineGeometry, lineMaterial);
	frontLine.position.set(0, height + lineHeight / 2, -length / 2);
	group.add(frontLine);

	const backLine = frontLine.clone();
	backLine.position.z = length / 2;
	group.add(backLine);

	const leftLine = new THREE.Mesh(shortLineGeometry, lineMaterial);
	leftLine.position.set(-width / 2, height + lineHeight / 2, 0);
	group.add(leftLine);

	const rightLine = leftLine.clone();
	rightLine.position.x = width / 2;
	group.add(rightLine);

	// Center line (helps orientation)
	const centerLine = new THREE.Mesh(shortLineGeometry, lineMaterial);
	centerLine.position.set(0, height + lineHeight / 2, 0);
	group.add(centerLine);

	// Net
	const netGeometry = new THREE.BoxGeometry(width, netHeight, netThickness);
	const netMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 });
	const net = new THREE.Mesh(netGeometry, netMaterial);
	net.position.set(0, height + netHeight / 2, 0);
	net.castShadow = true;
	group.add(net);

	return group;
}
