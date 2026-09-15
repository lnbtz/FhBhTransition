import type { Drill, PracticeGuide } from './types';

const fhBlockGuide: PracticeGuide = {
	goal: 'Groove a compact, repeatable forehand rally loop — not a one-ball winner.',
	steps: [
		'Start low and balanced. Turn from the waist while the racket stays above table height.',
		'Contact around the top of the bounce, slightly in front. Brush forward over the ball with a modestly closed blade.',
		'Finish compactly, recover the racket and hips to neutral before the next block arrives.'
	],
	check: 'The ball should clear the net safely, land deep and leave you balanced enough to repeat the same stroke.'
};

const bhBlockGuide: PracticeGuide = {
	goal: 'Build a quick backhand loop that can repeat at continuous rally pace.',
	steps: [
		'Keep the elbow a little forward and the racket in front of the body; avoid a large backswing.',
		'Meet the ball around the top of the bounce. Let the forearm lead and brush forward with a slightly closed blade.',
		'Finish in front, then relax the forearm and return directly to the ready position.'
	],
	check: 'Your head stays quiet, the contact remains in front, and the racket is ready again before the next feed.'
};

const fhBackspinGuide: PracticeGuide = {
	goal: 'Learn the upward-and-forward shape needed to open safely against underspin.',
	steps: [
		'Lower through the legs and let the racket drop below the ball; do not reach down with only the arm.',
		'Contact near the top of the bounce with a slightly more open blade and brush up through the back of the ball.',
		'Use the legs and waist to lift, then finish forward and recover instead of throwing the arm high.'
	],
	check: 'A good opening loop has a visible arc and spin, lands past mid-table and still leaves you ready for the block.'
};

const bhBackspinGuide: PracticeGuide = {
	goal: 'Open against underspin with a compact backhand and a clear upward acceleration.',
	steps: [
		'Set the racket below the ball with knees bent, elbow forward and the wrist relaxed rather than forced.',
		'Brush up and forward near the top of the bounce. Accelerate the forearm without pulling the elbow across the body.',
		'Finish in front of the face, then return straight to neutral for the next ball.'
	],
	check: 'The contact feels thin, the ball arcs over the net with spin, and your torso does not stand up or drift backward.'
};

export const drills: Drill[] = [
	{
		id: 'fh-bh',
		name: 'FH–BH two-point',
		category: 'Footwork',
		description: 'Alternate compact side steps. Play, reset, then move.',
		defaultInterval: 1200,
		pattern: [
			{ zone: 'right', response: 'FH', cue: 'Side step · forehand' },
			{ zone: 'left', response: 'BH', cue: 'Recover centre · backhand' }
		]
	},
	{
		id: 'bh-middle-bh-fh',
		name: 'BH–middle–BH–FH',
		category: 'Footwork',
		description: 'Four-ball transition: BH corner, elbow, BH corner, then FH corner.',
		defaultInterval: 1200,
		pattern: [
			{ zone: 'left', response: 'BH', cue: 'BH corner · stay low' },
			{ zone: 'middle', response: 'FH', cue: 'Move out · middle FH' },
			{ zone: 'left', response: 'BH', cue: 'Return · compact BH' },
			{ zone: 'right', response: 'FH', cue: 'Cover FH · then reset' }
		]
	},
	{
		id: 'two-two',
		name: '2 BH–2 FH',
		category: 'Footwork',
		description: 'Two backhands, move once, then two forehands and recover.',
		defaultInterval: 1150,
		pattern: [
			{ zone: 'left', response: 'BH', cue: 'BH one · stable base' },
			{ zone: 'left', response: 'BH', cue: 'BH two · prepare move' },
			{ zone: 'right', response: 'FH', cue: 'Move · FH one' },
			{ zone: 'right', response: 'FH', cue: 'FH two · recover centre' }
		]
	},
	{
		id: 'fh-middle',
		name: 'FH–middle',
		category: 'Footwork',
		description: 'Forehand corner to middle, using a controlled in-and-out shuffle.',
		defaultInterval: 1200,
		pattern: [
			{ zone: 'wide-right', response: 'FH', cue: 'Move wide · forehand' },
			{ zone: 'middle', response: 'FH', cue: 'Shuffle in · middle forehand' }
		]
	},
	{
		id: 'bh-middle',
		name: 'BH–middle',
		category: 'Footwork',
		description: 'Backhand from the corner, then create room for a forehand at the elbow.',
		defaultInterval: 1200,
		pattern: [
			{ zone: 'left', response: 'BH', cue: 'BH corner · hold balance' },
			{ zone: 'middle', response: 'FH', cue: 'Move out · middle forehand' }
		]
	},
	{
		id: 'three-point',
		name: 'FH three-point',
		category: 'Footwork',
		description: 'Wide forehand, middle, then pivot from the backhand corner.',
		defaultInterval: 1250,
		pattern: [
			{ zone: 'wide-right', response: 'FH', cue: 'Wide FH' },
			{ zone: 'middle', response: 'FH', cue: 'Recover · middle FH' },
			{ zone: 'left', response: 'FH pivot', cue: 'Pivot · then reset' }
		]
	},
	{
		id: 'falkenberg',
		name: 'Falkenberg',
		category: 'Footwork',
		description: 'Classic BH, pivot FH, wide FH pattern.',
		defaultInterval: 1250,
		pattern: [
			{ zone: 'left', response: 'BH', cue: 'BH from corner' },
			{ zone: 'left', response: 'FH pivot', cue: 'Pivot around' },
			{ zone: 'wide-right', response: 'FH', cue: 'Cross over · wide FH' }
		]
	},
	{
		id: 'pivot-recover',
		name: 'Pivot and recover',
		category: 'Footwork',
		description: 'Commit to the pivot, then cover the open forehand.',
		defaultInterval: 1300,
		pattern: [
			{ zone: 'left', response: 'FH pivot', cue: 'Pivot from BH corner' },
			{ zone: 'wide-right', response: 'FH', cue: 'Recover fast · wide FH' }
		]
	},
	{
		id: 'wide-recovery',
		name: 'Wide-ball recovery',
		category: 'Footwork',
		description: 'Wide to wide with a deliberate neutral reset.',
		defaultInterval: 1400,
		pattern: [
			{ zone: 'wide-right', response: 'FH', cue: 'Wide FH · reset neutral' },
			{ zone: 'wide-left', response: 'BH', cue: 'Wide BH · reset neutral' }
		]
	},
	{
		id: 'in-out',
		name: 'In–out movement',
		category: 'Footwork',
		description: 'Step in under control, then recover away for depth.',
		defaultInterval: 1450,
		pattern: [
			{ zone: 'short-right', response: 'short touch', feed: 'backspin', cue: 'Step in · touch' },
			{ zone: 'right', response: 'FH loop', feed: 'topspin', cue: 'Push away · loop deep' }
		]
	},
	{
		id: 'deep-short-deep',
		name: 'Deep–short–deep',
		category: 'Footwork',
		description: 'Read depth and keep balance moving forward and back.',
		defaultInterval: 1400,
		pattern: [
			{ zone: 'left', response: 'BH', cue: 'Deep · hold ground' },
			{ zone: 'short-left', response: 'short touch', feed: 'backspin', cue: 'Short · step in' },
			{ zone: 'right', response: 'FH', cue: 'Recover out · deep FH' }
		]
	},
	{
		id: 'random-all',
		name: 'Random all table',
		category: 'Footwork',
		description: 'Unpredictable deep balls from wide BH to wide FH, including the elbow.',
		defaultInterval: 1300,
		random: true,
		pattern: [
			{ zone: 'wide-left', response: 'BH', cue: 'Read · wide BH' },
			{ zone: 'left', response: 'BH', cue: 'Read · BH half' },
			{ zone: 'middle', response: 'FH', decision: ['FH', 'BH'], cue: 'Elbow · decide early' },
			{ zone: 'right', response: 'FH', cue: 'Read · FH half' },
			{ zone: 'wide-right', response: 'FH', cue: 'Read · wide FH' }
		]
	},
	{
		id: 'controlled',
		name: 'Random + short',
		category: 'Footwork',
		description: 'Corners and elbow with an occasional short underspin ball.',
		defaultInterval: 1350,
		random: true,
		pattern: [
			{ zone: 'left', response: 'BH', cue: 'Read racket' },
			{ zone: 'middle', response: 'FH', decision: ['FH', 'BH'], cue: 'Elbow · decide' },
			{ zone: 'wide-right', response: 'FH', cue: 'Move wide' },
			{ zone: 'short-left', response: 'short touch', feed: 'backspin', cue: 'Short · step in' },
			{ zone: 'short-right', response: 'short touch', feed: 'backspin', cue: 'Short · step in' }
		]
	},
	{
		id: 'fh-loop',
		name: 'FH loop vs block',
		category: 'Stroke',
		description: 'Repeat a compact forehand loop against a quick block.',
		defaultInterval: 1050,
		guide: fhBlockGuide,
		pattern: [{ zone: 'right', response: 'FH loop', feed: 'block', cue: 'Forward brush · recover' }]
	},
	{
		id: 'bh-loop',
		name: 'BH loop vs block',
		category: 'Stroke',
		description: 'Repeat a compact backhand loop against a quick block.',
		defaultInterval: 1050,
		guide: bhBlockGuide,
		pattern: [{ zone: 'left', response: 'BH loop', feed: 'block', cue: 'Contact in front · recover' }]
	},
	{
		id: 'fh-open',
		name: 'FH loop vs underspin',
		category: 'Stroke',
		description: 'Open safely with forehand against a deep underspin feed.',
		defaultInterval: 1350,
		guide: fhBackspinGuide,
		pattern: [{ zone: 'right', response: 'FH opening loop', feed: 'backspin', cue: 'Get low · brush up and forward' }]
	},
	{
		id: 'bh-open',
		name: 'BH loop vs underspin',
		category: 'Stroke',
		description: 'Open safely with backhand against a deep underspin feed.',
		defaultInterval: 1350,
		guide: bhBackspinGuide,
		pattern: [{ zone: 'left', response: 'BH opening loop', feed: 'backspin', cue: 'Racket below · brush up' }]
	},
	{
		id: 'bh-fh-combo',
		name: 'BH loop → FH loop',
		category: 'Stroke',
		description: 'Change sides without losing the contact rhythm.',
		defaultInterval: 1100,
		guide: {
			goal: 'Keep both loops compact while the feet move the contact point into place.',
			steps: [
				'Play the backhand in front of the body and recover the racket immediately.',
				'Move first; turn the waist only after the forehand ball has been read.',
				'Use the same controlled effort on both sides rather than attacking harder on the forehand.'
			],
			check: 'Both contacts happen in front and the transition does not make you stand up or reach.'
		},
		pattern: [
			{ zone: 'left', response: 'BH loop', feed: 'block', cue: 'BH loop · recover' },
			{ zone: 'right', response: 'FH loop', feed: 'block', cue: 'Move first · FH loop' }
		]
	},
	{
		id: 'two-two-loop',
		name: '2 BH–2 FH loops',
		category: 'Stroke',
		description: 'Two compact loops on each wing against continuous blocks.',
		defaultInterval: 1100,
		guide: {
			goal: 'Join stable repetition with one clean side-step transition.',
			steps: [
				'Use the first ball on each side to establish balance and timing.',
				'After the second ball, recover the racket while the feet move to the other wing.',
				'Keep the same arc and effort for all four balls.'
			],
			check: 'The fourth ball looks as controlled as the first and you finish ready to repeat the pattern.'
		},
		pattern: [
			{ zone: 'left', response: 'BH loop', feed: 'block', cue: 'BH one · compact' },
			{ zone: 'left', response: 'BH loop', feed: 'block', cue: 'BH two · prepare move' },
			{ zone: 'right', response: 'FH loop', feed: 'block', cue: 'FH one · find balance' },
			{ zone: 'right', response: 'FH loop', feed: 'block', cue: 'FH two · recover' }
		]
	},
	{
		id: 'fh-open-next',
		name: 'FH opening → next loop',
		category: 'Stroke',
		description: 'Open against underspin, then adjust forward for the faster block.',
		defaultInterval: 1250,
		guide: {
			goal: 'Change from an upward opening stroke to a more forward rally loop.',
			steps: [
				'Brush the underspin ball up and forward with a safe arc.',
				'Recover immediately; expect the block to arrive sooner and higher.',
				'Shorten the second swing, close the blade slightly and direct the force forward.'
			],
			check: 'The second stroke is visibly smaller and more forward than the opening stroke.'
		},
		pattern: [
			{ zone: 'right', response: 'FH opening loop', feed: 'backspin', cue: 'Open · brush up' },
			{ zone: 'middle', response: 'FH loop', feed: 'block', cue: 'Recover · forward next ball' }
		]
	},
	{
		id: 'bh-open-next',
		name: 'BH opening → next loop',
		category: 'Stroke',
		description: 'Open with backhand, then stay close for the faster block.',
		defaultInterval: 1250,
		guide: {
			goal: 'Recover quickly after the upward opening motion and take the next block early.',
			steps: [
				'Lift the underspin ball with legs and a compact upward forearm action.',
				'Keep the elbow forward and bring the racket directly back to neutral.',
				'For the block, close the blade slightly and accelerate more forward than upward.'
			],
			check: 'You stay close to the table and never need a second large backswing.'
		},
		pattern: [
			{ zone: 'left', response: 'BH opening loop', feed: 'backspin', cue: 'Open · brush up' },
			{ zone: 'middle', response: 'BH loop', feed: 'block', cue: 'Stay close · forward next ball' }
		]
	},
	{
		id: 'opening-choice',
		name: 'Random opening: FH or BH',
		category: 'Stroke',
		description: 'Read a deep underspin feed and open from either wing.',
		defaultInterval: 1450,
		random: true,
		guide: {
			goal: 'Recognise the side first, then build the correct opening-loop shape.',
			steps: [
				'Stay neutral until the target is clear; avoid guessing before the feed.',
				'Move behind the ball and lower through the legs before starting the arm.',
				'Choose a safe, spin-first opening and recover to the middle after every ball.'
			],
			check: 'Your first movement is toward the ball and both wings produce a controlled arc past mid-table.'
		},
		pattern: [
			{ zone: 'left', response: 'BH opening loop', feed: 'backspin', cue: 'Read BH · get under' },
			{ zone: 'right', response: 'FH opening loop', feed: 'backspin', cue: 'Read FH · get under' }
		]
	}
];
