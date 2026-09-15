import type { Drill, Hand, ShotSpec, Step, Zone } from './types';

const xByZone: Record<Zone, number> = {'wide-left':-.68,left:-.49,middle:0,right:.49,'wide-right':.68,'short-left':-.32,'short-right':.32};
const isShort = (z: Zone) => z.startsWith('short');
export function sideLabel(zone: Zone, hand: Hand) {
	if (zone === 'middle') return 'ELBOW';
	const physicalLeft = hand === 'left' ? !zone.includes('left') : zone.includes('left');
	return physicalLeft === (hand === 'right') ? 'BACKHAND' : 'FOREHAND';
}
export function seeded(seed: number) { let n=seed|0; return () => ((n=Math.imul(48271,n)%2147483647)&2147483647)/2147483647; }
export function makeShot(drill: Drill, index: number, hand: Hand, variance: number, seed: number, speed: number): ShotSpec {
	const rand=seeded(seed + index*7919); let step: Step=drill.pattern[index%drill.pattern.length];
	if (drill.random) { const pool=drill.pattern; step=pool[Math.floor(rand()*pool.length)]; }
	if (step.decision) step={...step,response:step.decision[Math.floor(rand()*step.decision.length)]};
	// Patterns use conventional right-handed geometry, then mirror as one unit for a left-handed player.
	const mirror=hand==='left' ? -1 : 1;
	const spread=variance*.055;
	const targetX=Math.max(-.72,Math.min(.72,xByZone[step.zone]*mirror+(rand()-.5)*spread));
	const targetZ=isShort(step.zone) ? -.18+(rand()-.5)*variance*.08 : -1.02+(rand()-.5)*variance*.13;
	// First-bounce flight time in seconds. Match pace is intentionally a low, direct rally ball:
	// blocks arrive quickest, while backspin has a little more hang time for an opening stroke.
	const base=step.feed==='backspin'?.55:step.feed==='block'?.42:.46;
	return {...step,feed:step.feed??'topspin',targetX,targetZ,duration:base/speed+(rand()-.5)*variance*.018,seed};
}
