import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';

// Import the actual TypeScript motion/math modules without a browser or emitted files.
const urls=new Map();
function moduleUrl(file){
  if(urls.has(file))return urls.get(file);
  const source=ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
  const bundled=source.replace(/from ['"](\.\/[^'"]+)['"]/g,(_,name)=>`from '${moduleUrl(resolve(dirname(file),name+'.ts'))}'`);
  const url='data:text/javascript;base64,'+Buffer.from(bundled).toString('base64');urls.set(file,url);return url;
}
const base=resolve('src/world-preview');
const {portraitPose,choosePortraitAction,ACTION_DURATION,GREETING_MOVE}=await import(moduleUrl(resolve(base,'portrait-motion.ts')));
const {BODY_MESH,BODY_TRIANGLES,lowerBodyMesh}=await import(moduleUrl(resolve(base,'portrait-body.ts')));
const {UPPER_POSES,interpolateArm,upperBodyMeshes}=await import(moduleUrl(resolve(base,'portrait-upper.ts')));
const {HEAD_VIEWS,HEAD_TRIANGLES,headMesh,animatedHeadMesh}=await import(moduleUrl(resolve(base,'portrait-head.ts')));
const {createPortraitActionQueue}=await import(moduleUrl(resolve(base,'portrait-actions.ts')));
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
let minArea=Infinity;
for(let time=0;time<=46;time+=.02){
  const pose=portraitPose(time,0,0);
  for(const [part,mesh] of upperBodyMeshes(pose).entries()){
    for(let row=0;row<mesh.length-2;row+=2)for(const ids of [[row,row+1,row+3],[row,row+3,row+2]])assert(area(...ids.map(i=>mesh[i]))>0,`Idle mesh fold: ${time.toFixed(2)} part ${part}`);
  }
}
for(const action of Object.keys(ACTION_DURATION)){
  for(let age=-.01;age<=ACTION_DURATION[action]+.01;age+=.01){
    const p=portraitPose(12+age,.3,-.2,age,false,action);
    for(const [key,value] of Object.entries(p))if(typeof value==='number')assert(Number.isFinite(value),key);
    assert(p.approach>=-1e-8&&p.approach<=1+1e-8);
    assert(!('original' in p),'No original-image crossfade');
    const mesh=lowerBodyMesh(p.hipX,p.breath+p.crouch,p.bodyRoll,p);
    for(const indices of BODY_TRIANGLES){const a=area(...indices.map(i=>mesh[i]));assert(a>0,'Lower-body mesh folded');minArea=Math.min(minArea,a)}
    // Both shoes follow their individual ground path, not the torso translation.
    const scale=1+p.approach*GREETING_MOVE.scale;
    for(const [index,travel,lift,side] of [[31,p.leftTravel,p.leftStep,-1],[34,p.rightTravel,p.rightStep,1]]){
      const expectedX=BODY_MESH[index][0]+travel*GREETING_MOVE.x+p.legSpread*side*scale;
      const actualX=(mesh[index][0]-555)*scale+555+p.approach*GREETING_MOVE.x;
      const expectedY=BODY_MESH[index][1]+836+travel*GREETING_MOVE.y-lift*44+p.tiptoe*14*scale;
      const actualY=(mesh[index][1]+836-1490)*scale+1490+p.approach*GREETING_MOVE.y;
      assert(Math.abs(expectedX-actualX)<1e-8);assert(Math.abs(expectedY-actualY)<1e-8);
    }
    upperBodyMeshes(p).forEach((arm,part)=>{
      for(let row=0;row<arm.length-2;row+=2)for(const ids of [[row,row+1,row+3],[row,row+3,row+2]])assert(area(...ids.map(n=>arm[n]))>0,`${action} upper fold at ${age.toFixed(2)} part ${part} row ${row}`);
      for(const [x,y] of arm)assert(x>=-280&&x<=1280&&y>=-220&&y<=1000,`${action} clipped upper limb at ${age.toFixed(2)}: ${x},${y}`);
    });
  }
  for(const time of [0,12,19,22.99]){
   const baseline=portraitPose(time,.2,.2,100,false,action);
   for(const age of [0,ACTION_DURATION[action]]){
    const p=portraitPose(time,.2,.2,age,false,action);
    for(const key of Object.keys(baseline))if(typeof baseline[key]==='number')assert(Math.abs(p[key]-baseline[key])<1e-8,`${action} ${key} endpoint`);
   }
  }
}
for(let yaw=-.22;yaw<=.72;yaw+=.01)for(const smile of [0,.5,1]){
  const mesh=animatedHeadMesh(yaw,smile);
  for(const ids of HEAD_TRIANGLES)assert(area(...ids.map(i=>mesh[i]))>0,`Head mesh fold: ${yaw} smile ${smile}`);
  assert.deepEqual(mesh.slice(0,18),headMesh(HEAD_VIEWS[2]).slice(0,18),'Hair blocks stay rigid');
}
const queue=createPortraitActionQueue(()=> 'wave');
for(let n=0;n<100;n++)queue.enqueue(0);
assert.equal(queue.sample(0).accepted,100);assert.equal(queue.sample(0).started,1);assert.equal(queue.sample(0).pending,99);
assert.equal(queue.sample(1).started,1);assert.equal(queue.sample(1).pending,99);
const end=queue.sample(600);assert.equal(end.started,100);assert.equal(end.pending,0);assert.equal(end.active,false);
const force=createPortraitActionQueue(()=> 'nod');assert.equal(force.enqueue(17,'siu').action,'siu');
for(const part of [0,2]){
  const a=UPPER_POSES.rest[part].rows;
  const b=UPPER_POSES.raised[part].rows.map(pair=>pair.map(([x,y])=>[x*1.2-240,y*1.2+8]));
  for(let i=0;i<=100;i++){
    const mesh=interpolateArm(a,b,i/100);
    for(let row=0;row<mesh.length-2;row+=2)for(const ids of [[row,row+1,row+3],[row,row+3,row+2]])assert(area(...ids.map(n=>mesh[n]))>0,`Arm mesh fold ${part}:${i}:${row}`);
  }
}
let rare=0;for(let i=0;i<10000;i++)if(choosePortraitAction(i/10000)==='original')rare++;
assert.equal(rare,2500);
const peaks=(key,start,end)=>{
  let n=0,prev=0,rising=false;
  for(let age=start;age<=end;age+=.005){const v=portraitPose(age,0,0,age,false,'original')[key];if(v<prev&&rising){n++;rising=false}else if(v>prev)rising=true;prev=v}return n;
};
assert.equal(peaks('leftStep',0,2),1);assert.equal(peaks('rightStep',0,2),1);
assert.equal(peaks('leftStep',7.1,9.2),1);assert.equal(peaks('rightStep',7.1,9.2),1);
assert.equal(peaks('nod',3.3,5.2),2);
assert.equal(portraitPose(3,1,1,3,true,'original').approach,0);
const siuLanding=portraitPose(2.15,0,0,2.15,false,'siu');
assert(Math.abs(siuLanding.rootY)<1e-10);
assert.equal(siuLanding.legSpread,portraitPose(2.3,0,0,2.3,false,'siu').legSpread,'Siu feet finish opening before touching the ground');
console.log(`PASS: five actions, continuous endpoints, queued 100 clicks without loss, planted feet, 25% celebration probability, head/arm/leg meshes (minimum leg area ${minArea.toFixed(2)}).`);
