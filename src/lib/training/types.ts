export type Hand = 'left' | 'right';
export type Zone = 'wide-left' | 'left' | 'middle' | 'right' | 'wide-right' | 'short-left' | 'short-right';
export type Stroke = 'block' | 'topspin' | 'backspin';
export type Response = 'FH' | 'BH' | 'FH pivot' | 'short touch' | 'opening loop';

export interface Step {
	zone: Zone;
	response: Response;
	feed?: Stroke;
	cue: string;
	decision?: Response[];
}

export interface Drill {
	id: string;
	name: string;
	category: 'Footwork' | 'Stroke';
	description: string;
	pattern: Step[];
	defaultInterval: number;
}

export interface ShotSpec extends Step {
	targetX: number;
	targetZ: number;
	duration: number;
	seed: number;
}
