import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';

const code=ts.transpile(readFileSync(resolve('src/world-preview/judefan-motion.ts'),'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {JUDEFAN_ACTION_DURATIONS,JUDEFAN_IDLE_DELAY,JUDEFAN_IDLE_SETTLE,JUDEFAN_CLICK_GAP,judefanPose,chooseJudefanAction,createJudefanController}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const rest=judefanPose(null,0),numericKeys=Object.keys(rest).filter(k=>typeof rest[k]==='number');
const jumpKeys=['jumpY','airborne','landing','anticipation'];
for(const key of jumpKeys)assert.equal(rest[key],0,'Neutral jump field '+key+' is defined and zero');
assert.equal(JUDEFAN_ACTION_DURATIONS.salute,6.5,'The jump/landing has room before the open-palm hold');
let frames=0,maxWeightSpeed=0,maxJumpSpeed=0;
for(const action of ['original','salute','laugh']){
  const duration=JUDEFAN_ACTION_DURATIONS[action];
  for(const age of [-1,0,duration,duration+1,NaN,Infinity])assert.deepEqual(judefanPose(action,age),rest,'Action endpoints/outside remain exactly neutral');
  for(const age of [0,.5,1.5,3,duration])assert.deepEqual(judefanPose(action,age,10,true),rest,'Reduced motion is a still pose');
  let previous=judefanPose(action,0),peak=0;
  for(let frame=0;frame<=Math.round(duration*100);frame++){
    const age=frame/100,pose=judefanPose(action,age);frames++;
    for(const key of numericKeys)assert(Number.isFinite(pose[key]),'Finite '+action+' '+key+' at '+age);
    for(const key of ['original','salute','laugh','mouthOpen','eyesClosed','knees','airborne','landing','anticipation'])assert(pose[key]>=0&&pose[key]<=1,'Bounded '+key);
    assert(pose.jumpY>=-28&&pose.jumpY<=0,'Jump root never sinks below the ground or exceeds its apex');
    if(action!=='salute')for(const key of jumpKeys)assert.equal(pose[key],0,'Only open-palm action jumps: '+action+' '+key);
    const jumpSpeed=Math.abs(pose.jumpY-previous.jumpY)/.01;maxJumpSpeed=Math.max(maxJumpSpeed,jumpSpeed);
    assert(jumpSpeed<94,'Flight follows a continuous lift/landing arc rather than a teleport');
    for(const key of ['original','salute','laugh']){
      const speed=Math.abs(pose[key]-previous[key])/.01;maxWeightSpeed=Math.max(maxWeightSpeed,speed);
      assert(speed<2.25,'Minimum-jerk gesture weight, not a pose jump');
      if(key!==action)assert.equal(pose[key],0,'Only requested gesture has a weight');
    }
    assert(Math.abs(pose.bodyRoll)<2.6&&Math.abs(pose.headTilt)<3.6,'Subtle full-body/head shake');
    peak=Math.max(peak,pose[action]);previous=pose;
  }
  assert.equal(peak,1,'Gesture reaches its full reference pose');
  for(const endpoint of [0,duration])for(const delta of [-.001,.001]){
    const pose=judefanPose(action,endpoint+delta);
    for(const key of numericKeys)assert(Math.abs(pose[key]-rest[key])<1e-6,'Continuous gesture endpoint '+key);
  }
}
assert.equal(chooseJudefanAction(0),'original');assert.equal(chooseJudefanAction(.4999),'original');
assert.equal(chooseJudefanAction(.5),'salute');assert.equal(chooseJudefanAction(1),'salute');
assert(judefanPose('laugh',2).mouthOpen>.8&&judefanPose('laugh',2).eyesClosed>.89,'Belly laugh has expressive face');
assert(judefanPose('laugh',2).bodyRoll<0,'Laugh leans back, not a cough bow');
assert(judefanPose('salute',2).knees>.7,'Open palm stance has bent knees');
assert.notEqual(judefanPose(null,0,0).breath,judefanPose(null,0,1.4).breath,'Natural breathing without a gesture');

// The reference pose is the payoff AFTER a real, single jump and cushioned
// touchdown. Rising arms alone must not pass as the requested jump.
const prepare=judefanPose('salute',.3),apex=judefanPose('salute',.975),impact=judefanPose('salute',1.61),hold=judefanPose('salute',2.2);
assert(prepare.anticipation>.99&&prepare.airborne===0&&prepare.salute===0,'Crouch first, before leaving the ground or revealing the final pose');
assert(Math.abs(apex.airborne-1)<1e-10&&Math.abs(apex.jumpY+28)<1e-9,'Flight peaks at .975s with a 28px lift, clear of the existing member strip');
assert(apex.salute<.1,'He is still opening the gesture at the jump apex');
assert(impact.landing>.99&&impact.airborne===0&&impact.jumpY===0,'Touchdown has a separate landing-compression beat');
assert.equal(hold.salute,1,'The full reference gesture settles after landing');
assert.equal(hold.landing,0,'Landing compression resolves while holding the gesture');
for(const age of [0,.49,.5,1.45,2.2,5,6.5])assert.equal(judefanPose('salute',age).jumpY,0,'Only .5..1.45s is airborne');
for(const boundary of [.5,1.45])for(const delta of [-.0001,.0001])assert(Math.abs(judefanPose('salute',boundary+delta).jumpY)<.0001,'The flight meets the ground without a positional/velocity snap');

for(const random of [0,.37,1]){
  const controller=createJudefanController(()=>random),start=controller.sample(0).nextIdleAt;
  assert(start>=JUDEFAN_IDLE_DELAY.min&&start<=JUDEFAN_IDLE_DELAY.max,'Random idle gap is 10..19 seconds');
  assert.equal(controller.sample(start-.001).mode,'rest');
  assert.equal(controller.sample(start).mode,'idle');
  assert.equal(controller.sample(start+1.5).action,'laugh');
  assert(controller.sample(start+1.5).pose.laugh>.99);
  const end=controller.sample(start+JUDEFAN_ACTION_DURATIONS.laugh);
  assert.equal(end.mode,'rest');
  assert(end.nextIdleAt-(start+JUDEFAN_ACTION_DURATIONS.laugh)>=10,'Idle ends with a genuine random pause');
}

// Clicking while laughing first unwinds that exact pose, then plays the click.
const interrupted=createJudefanController(()=>0),due=interrupted.sample(0).nextIdleAt;
interrupted.sample(due);const before=interrupted.sample(due+2);
interrupted.click(due+2);const after=interrupted.sample(due+2);
assert.equal(after.mode,'settling');
for(const key of numericKeys)assert.equal(after.pose[key],before.pose[key],'No idle interruption jump in '+key);
const midway=interrupted.sample(due+2+JUDEFAN_IDLE_SETTLE/2);
assert(midway.pose.laugh<after.pose.laugh&&midway.pose.laugh>0,'Outgoing laughter relaxes smoothly');
const begun=interrupted.sample(due+2+JUDEFAN_IDLE_SETTLE);
assert.equal(begun.mode,'click');assert.equal(begun.action,'original');assert.equal(begun.pose.original,0);
assert.equal(begun.pose.laugh,0);assert.equal(begun.started,1);

// Every click is selected once and retained; autonomous laughter cannot swallow it.
let roll=0;
const queued=createJudefanController(()=>((roll++)%2));
for(let n=0;n<100;n++)queued.click(0);
assert.equal(queued.sample(0).accepted,100);assert.equal(queued.sample(0).started,1);assert.equal(queued.sample(0).pending,99);
const seen=new Set();
const queueEnd=100*(Math.max(...Object.values(JUDEFAN_ACTION_DURATIONS))+JUDEFAN_CLICK_GAP)+1;
for(let t=0;t<queueEnd;t+=.07){const sample=queued.sample(t);if(sample.mode==='click')seen.add(sample.action)}
const done=queued.sample(queueEnd);
assert.equal(done.started,100);assert.equal(done.pending,0);assert.equal(done.accepted,100);
assert(seen.has('original')&&seen.has('salute'),'Both random click actions play');

const reduction=createJudefanController(()=>0);
reduction.sample(0,true);
for(const t of [2,10,50,1000]){
  const sample=reduction.sample(t,true);
  assert.equal(sample.mode,'reduced');assert.equal(sample.action,null);assert.equal(sample.idleStarted,0);assert.deepEqual(sample.pose,rest);
}
const resumed=reduction.sample(1000,false);
assert.equal(resumed.mode,'rest');assert(resumed.nextIdleAt>1000,'Reducing motion freezes the autonomous countdown');
assert.equal(createJudefanController(()=>0).sample(1000,true).idleStarted,0,'First late reduced-motion sample must not trigger idle');
for(const t of [NaN,Infinity,-100]){
  const sample=reduction.sample(t);assert(Number.isFinite(sample.age)&&Number.isFinite(sample.nextIdleAt),'Invalid/backward clocks cannot produce NaN');
}

console.log('PASS: '+frames+' deterministic pose frames, crouch/jump/landing/open-palm sequence, expressive idle laugh/random 10..19s pauses, both click gestures, continuous idle interruption, 100 queued clicks without loss, reduced motion (max weight speed '+maxWeightSpeed.toFixed(2)+'/s, jump '+maxJumpSpeed.toFixed(1)+'px/s).');
