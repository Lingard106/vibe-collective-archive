import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpile(readFileSync('src/world-preview/melon-bubble.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {MELON_BUBBLE_DOTS,MELON_BUBBLE_PERIOD,melonBubbleDot}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(MELON_BUBBLE_DOTS.length,3);
for(let frame=0;frame<=640;frame++)for(let index=0;index<3;index++){
  const time=frame/100,pose=melonBubbleDot(time,index),repeat=melonBubbleDot(time+MELON_BUBBLE_PERIOD,index);
  assert(pose.y>=-3.2&&pose.y<=0);assert(pose.opacity>=.36&&pose.opacity<=1);
  assert(Math.abs(pose.y-repeat.y)<1e-10&&Math.abs(pose.opacity-repeat.opacity)<1e-10,'Loop is seamless');
  assert.deepEqual(melonBubbleDot(time,index,true),{y:0,opacity:1},'Reduced motion retains three static dots');
  const next=melonBubbleDot(time+.001,index);assert(Math.abs(next.y-pose.y)<.014,'No dot position snap');
}
for(let index=0;index<3;index++){
  const pose=melonBubbleDot(index*.18*MELON_BUBBLE_PERIOD,index);
  assert.equal(pose.opacity,1,'Dots reach their peaks from left to right');
}
for(const time of [NaN,Infinity,-Infinity])assert(Number.isFinite(melonBubbleDot(time,0).y));
console.log('PASS: three sequential pixel dots, seamless1.6s loop, bounded motion, reduced motion and invalid-time handling.');
