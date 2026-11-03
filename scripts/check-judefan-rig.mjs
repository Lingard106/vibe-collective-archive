import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';

const urls=new Map();
function moduleUrl(file){
  if(urls.has(file))return urls.get(file);
  const code=ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
  const bundled=code.replace(/from ['"](.\/[^'"]+)['"]/g,(_,name)=>`from '${moduleUrl(resolve(dirname(file),name+'.ts'))}'`);
  const url='data:text/javascript;base64,'+Buffer.from(bundled).toString('base64');urls.set(file,url);return url;
}
const {judefanRig,JUDEFAN_CANVAS}=await import(moduleUrl(resolve('src/world-preview/judefan-painter.ts')));
const {judefanPose,JUDEFAN_ACTION_DURATIONS}=await import(moduleUrl(resolve('src/world-preview/judefan-motion.ts')));
assert.equal(JUDEFAN_CANVAS.top,-64,'The canvas has headroom for the jump without changing world registration');
assert.equal(JUDEFAN_CANVAS.height,684);
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const points=rig=>[...rig.arms.flatMap(a=>[a.shoulder,a.elbow,a.wrist]),...rig.legs.flatMap(l=>[l.hip,l.knee,l.ankle]),rig.headPoint([284,25]),rig.headPoint([437,145])];
let frames=0,maxSpeed=0,minBone=Infinity,flightFrames=0;
for(const action of ['original','salute','laugh']){
  const duration=JUDEFAN_ACTION_DURATIONS[action];let previous;
  for(let i=0;i<=Math.round(duration*100);i++){
    const age=i/100,pose=judefanPose(action,age,age),rig=judefanRig(pose,age),vertices=points(rig);frames++;
    for(const point of vertices){
      assert(point.every(Number.isFinite),'Every rig point is finite');
      assert(point[0]>0&&point[0]<JUDEFAN_CANVAS.width&&point[1]>JUDEFAN_CANVAS.top&&point[1]<JUDEFAN_CANVAS.top+JUDEFAN_CANVAS.height,'Rig stays inside the padded native canvas, including airborne hair');
    }
    for(const arm of rig.arms)for(const [a,b]of [[arm.shoulder,arm.elbow],[arm.elbow,arm.wrist]]){
      const length=distance(a,b);minBone=Math.min(minBone,length);assert(length>25&&length<115,'Sleeve bones retain sensible lengths without near-zero rotation flips');
    }
    const expectedFootY=510+pose.jumpY-pose.airborne*8;
    rig.legs.forEach(leg=>assert(Math.abs(leg.ankle[1]-expectedFootY)<1e-9,'Shoes follow the root flight and small in-air tuck, not a planted-foot body bob'));
    if(action!=='salute')assert.deepEqual(rig.legs.map(l=>l.ankle),[[305,510],[435,510]],'Laugh/point/breath do not slide or lift feet');
    if(pose.airborne>0){flightFrames++;assert(action==='salute'&&rig.legs.every(leg=>leg.ankle[1]<510),'Both feet genuinely leave the ground only during the jump')}
    else rig.legs.forEach(leg=>assert.equal(leg.ankle[1],510,'Grounded and landed shoes are planted'));
    if(previous)vertices.forEach((p,index)=>{const speed=distance(p,previous[index])/.01;maxSpeed=Math.max(maxSpeed,speed);assert(speed<300,`No limb snaps during pose transitions (${action} ${age.toFixed(2)}s point${index}, speed${speed.toFixed(1)})`)});
    previous=vertices;
  }
  for(const age of [0,duration]){
    const rig=judefanRig(judefanPose(action,age,0),0),rest=judefanRig(judefanPose(null,0,0),0);
    assert.deepEqual(points(rig),points(rest),'Every action returns exactly to the same neutral anatomy');
  }
}
assert(flightFrames>0,'The open-palm sequence has actual off-ground rig frames');
const stillRig=age=>judefanRig(judefanPose('salute',age,0),0);
const crouch=stillRig(.3),rest=judefanRig(judefanPose(null,0,0),0),apex=stillRig(.975),impact=stillRig(1.61),hold=stillRig(2.2);
crouch.legs.forEach((leg,index)=>assert(leg.hip[1]>rest.legs[index].hip[1]+8,'Preparation lowers the body while the feet stay down'));
apex.legs.forEach(leg=>assert(Math.abs(leg.ankle[1]-474)<1e-8,'At apex the shoes are 36px above their rest anchors'));
const apexPose=judefanPose('salute',.975,0),noArmSwing=judefanRig({...apexPose,airborne:0},0);
apex.arms.forEach((arm,index)=>{
  assert.deepEqual(arm.shoulder,noArmSwing.arms[index].shoulder,'Arm swing is independent of the body flight, not another whole-actor translation');
  assert(arm.wrist[1]<noArmSwing.arms[index].wrist[1]-40,'Both forearms rise naturally during the jump');
});
assert(apex.arms[0].wrist[0]>noArmSwing.arms[0].wrist[0]+20&&apex.arms[1].wrist[0]<noArmSwing.arms[1].wrist[0]-12,'In-air hands swing inward before opening into the landed gesture');
impact.legs.forEach((leg,index)=>{
  assert(leg.hip[1]>hold.legs[index].hip[1]+10,'Landing bends the hips to absorb the impact');
  assert(leg.knee[1]>hold.legs[index].knee[1]+5,'Landing bends the knees rather than translating a rigid statue');
});
for(let age=1.45;age<5.15;age+=.05)assert.deepEqual(stillRig(age).legs.map(leg=>leg.ankle),hold.legs.map(leg=>leg.ankle),'The stance is planted after touchdown, with no sliding during the hold');
console.log(`PASS: ${frames} anatomical frames; ${flightFrames} genuinely airborne frames, padded headroom, planted takeoff/landing, cushioned hips/knees, continuous neutral endpoints, min arm bone ${minBone.toFixed(1)}px, max point speed ${maxSpeed.toFixed(1)}px/s.`);
