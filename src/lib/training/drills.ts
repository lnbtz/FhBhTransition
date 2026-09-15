import type { Drill } from './types';

export const drills: Drill[] = [
	{ id:'fh-bh', name:'FH–BH two-point', category:'Footwork', description:'Alternate compact side steps. Play, reset, then move.', defaultInterval:1200, pattern:[
		{zone:'right',response:'FH',cue:'Side step · forehand'}, {zone:'left',response:'BH',cue:'Recover centre · backhand'}]},
	{ id:'bh-middle', name:'BH corner–middle', category:'Footwork', description:'Own the backhand corner, then decide at the elbow.', defaultInterval:1200, pattern:[
		{zone:'left',response:'BH',cue:'Set at BH corner'}, {zone:'middle',response:'BH',decision:['FH','BH'],cue:'Elbow ball · decide early'}]},
	{ id:'fh-middle', name:'FH corner–middle', category:'Footwork', description:'Two forehands with a controlled shuffle in and out.', defaultInterval:1200, pattern:[
		{zone:'wide-right',response:'FH',cue:'Move wide · forehand'}, {zone:'middle',response:'FH',cue:'Shuffle in · forehand'}]},
	{ id:'three-point', name:'FH three-point', category:'Footwork', description:'Wide forehand, middle, then pivot from the backhand corner.', defaultInterval:1250, pattern:[
		{zone:'wide-right',response:'FH',cue:'Wide FH'}, {zone:'middle',response:'FH',cue:'Recover · middle FH'}, {zone:'left',response:'FH pivot',cue:'Pivot · then reset'}]},
	{ id:'falkenberg', name:'Falkenberg', category:'Footwork', description:'Classic BH, pivot FH, wide FH pattern.', defaultInterval:1250, pattern:[
		{zone:'left',response:'BH',cue:'BH from corner'}, {zone:'left',response:'FH pivot',cue:'Pivot around'}, {zone:'wide-right',response:'FH',cue:'Cross over · wide FH'}]},
	{ id:'pivot-recover', name:'Pivot and recover', category:'Footwork', description:'Commit to the pivot, then cover the open forehand.', defaultInterval:1300, pattern:[
		{zone:'left',response:'FH pivot',cue:'Pivot from BH corner'}, {zone:'wide-right',response:'FH',cue:'Recover fast · wide FH'}]},
	{ id:'wide-recovery', name:'Wide-ball recovery', category:'Footwork', description:'Wide to wide with a deliberate neutral reset.', defaultInterval:1400, pattern:[
		{zone:'wide-right',response:'FH',cue:'Wide FH · reset neutral'}, {zone:'wide-left',response:'BH',cue:'Wide BH · reset neutral'}]},
	{ id:'in-out', name:'In–out movement', category:'Footwork', description:'Step in under control, then recover away for depth.', defaultInterval:1450, pattern:[
		{zone:'short-right',response:'short touch',feed:'backspin',cue:'Step in · touch'}, {zone:'right',response:'FH',feed:'topspin',cue:'Push away · loop deep'}]},
	{ id:'deep-short-deep', name:'Deep–short–deep', category:'Footwork', description:'Read depth and keep balance moving forward and back.', defaultInterval:1400, pattern:[
		{zone:'left',response:'BH',cue:'Deep · hold ground'}, {zone:'short-left',response:'short touch',feed:'backspin',cue:'Step in'}, {zone:'right',response:'FH',cue:'Recover out · deep FH'}]},
	{ id:'controlled', name:'Controlled random', category:'Footwork', description:'Seeded corners, elbow and occasional short balls.', defaultInterval:1300, pattern:[
		{zone:'left',response:'BH',cue:'Read racket'}, {zone:'middle',response:'FH',decision:['FH','BH'],cue:'Elbow · decide'}, {zone:'wide-right',response:'FH',cue:'Move wide'}, {zone:'short-left',response:'short touch',feed:'backspin',cue:'Short · step in'}]},
	{ id:'fh-loop', name:'FH loop vs block', category:'Stroke', description:'Repeat forehand timing against a quick block feed.', defaultInterval:1050, pattern:[{zone:'right',response:'FH',feed:'block',cue:'Set · loop at the top'}]},
	{ id:'bh-loop', name:'BH loop vs block', category:'Stroke', description:'Compact backhand loop against a quick block.', defaultInterval:1050, pattern:[{zone:'left',response:'BH',feed:'block',cue:'Set · compact loop'}]},
	{ id:'fh-open', name:'FH opening vs backspin', category:'Stroke', description:'Let the slower backspin ball fall into your window.', defaultInterval:1350, pattern:[{zone:'right',response:'opening loop',feed:'backspin',cue:'Get low · brush up'}]},
	{ id:'bh-open', name:'BH opening vs backspin', category:'Stroke', description:'Open with the backhand against deep backspin.', defaultInterval:1350, pattern:[{zone:'left',response:'opening loop',feed:'backspin',cue:'Get under · brush up'}]},
	{ id:'bh-fh-combo', name:'BH loop → FH loop', category:'Stroke', description:'Change sides without losing the contact rhythm.', defaultInterval:1100, pattern:[{zone:'left',response:'BH',feed:'block',cue:'BH loop'}, {zone:'right',response:'FH',feed:'block',cue:'Recover · FH loop'}]},
	{ id:'open-next', name:'Opening → next ball', category:'Stroke', description:'Open against backspin, then be ready for the block.', defaultInterval:1250, pattern:[{zone:'right',response:'opening loop',feed:'backspin',cue:'Open · recover'}, {zone:'middle',response:'FH',feed:'block',cue:'Next ball · forward'}]}
];
