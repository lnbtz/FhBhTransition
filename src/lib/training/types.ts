export type Hand = 'left' | 'right';
export type Zone = 'wide-left' | 'left' | 'middle' | 'right' | 'wide-right' | 'short-left' | 'short-right';
export type Stroke = 'block' | 'topspin' | 'backspin';
export type Response =
	| 'FH'
	| 'BH'
	| 'FH loop'
	| 'BH loop'
	| 'FH pivot'
	| 'short touch'
	| 'FH opening loop'
	| 'BH opening loop';

export interface Step {
	zone: Zone;
	response: Response;
	feed?: Stroke;
	cue: string;
	decision?: Response[];
}

export interface PracticeGuide {
	goal: string;
	steps: string[];
	check: string;
}

export interface Drill {
	id: string;
	name: string;
	category: 'Footwork' | 'Stroke';
	description: string;
	pattern: Step[];
	defaultInterval: number;
	random?: boolean;
	guide?: PracticeGuide;
}

export interface ShotSpec extends Step {
	targetX: number;
	targetZ: number;
	duration: number;
	seed: number;
}
