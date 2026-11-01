import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';

const code=ts.transpile(readFileSync(resolve('src/world-preview/melon-motion.ts'),'utf8'),{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,
});
const {MELON_EAT_DURATION,MELON_LIFT,melonEatingPose}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const rest=melonEatingPose(0);
const numericKeys=Object.keys(rest).filter(key=>typeof rest[key]==='number');
for(const age of [-10,0,MELON_EAT_DURATION,100,NaN,Infinity])assert.deepEqual(melonEatingPose(age),rest,'Outside an action stays in the original seated pose');
for(const age of [0,.4,1.6,2,3.5,4.8,6.5,8])assert.deepEqual(melonEatingPose(age,true),rest,'Reduced motion retains the still portrait');

let bitePeaks=0,lastBite=0,rising=false,previous=melonEatingPose(-.01),maxSpeed=0;
for(let n=-1;n<=MELON_EAT_DURATION*100+1;n++){
  const age=n/100,pose=melonEatingPose(age);
  for(const key of numericKeys)assert(Number.isFinite(pose[key]),`Finite ${key} at ${age}`);
  for(const key of ['lift','bite','chew','mouthOpen'])assert(pose[key]>=0&&pose[key]<=1,`Bounded ${key} at ${age}`);
  assert(pose.headTilt>=0&&pose.headTilt<=2.85,'No exaggerated head tilt');
  assert(pose.headY>=0&&pose.headY<=2.25,'No head detachment');
  assert(pose.torsoY>=0&&pose.torsoY<=1.35,'Seated torso stays anchored');
  assert(pose.forearmX>=MELON_LIFT.x-2&&pose.forearmX<=0,'Bounded lateral reach');
  assert(pose.forearmY>=MELON_LIFT.y-6&&pose.forearmY<=0,'Bounded mouth approach');
  if(pose.bite<lastBite&&rising){bitePeaks++;rising=false}else if(pose.bite>lastBite)rising=true;
  lastBite=pose.bite;
  const speed=Math.abs(pose.forearmY-previous.forearmY)/.01;
  maxSpeed=Math.max(maxSpeed,speed);assert(speed<205,'Forearms move smoothly rather than teleporting');
  assert(Math.abs(pose.headTilt-previous.headTilt)/.01<15,'Gentle head angular velocity');
  previous=pose;
}
assert.equal(bitePeaks,2,'Exactly two bites');
assert.equal(melonEatingPose(2).bite,1);assert.equal(melonEatingPose(3.5).bite,1);
assert.equal(melonEatingPose(1.6).lift,1);assert.equal(melonEatingPose(5.7).lift,1);
assert.equal(melonEatingPose(7.4).lift,0);
for(let n=30;n<160;n++)assert(melonEatingPose((n+1)/100).lift>=melonEatingPose(n/100).lift,'Lift rises monotonically');
for(let n=570;n<740;n++)assert(melonEatingPose((n+1)/100).lift<=melonEatingPose(n/100).lift,'Lower settles monotonically');
for(const age of [0,MELON_EAT_DURATION]){
  for(const delta of [-.001,.001])for(const key of numericKeys)assert(Math.abs(melonEatingPose(age+delta)[key]-rest[key])<1e-6,`Continuous ${key} endpoint`);
}
console.log(`PASS: one seated eating action, two bites, bounded rigid-head/forearm motion, neutral endpoints, reduced motion (max lift speed ${maxSpeed.toFixed(1)} scene px/s).`);
