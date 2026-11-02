import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';

const urls=new Map();
function moduleUrl(file){
  if(urls.has(file))return urls.get(file);
  const code=ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
  const bundled=code.replace(/from ['"](.\/[^'"]+)['"]/g,(_,name)=>'from \''+moduleUrl(resolve(dirname(file),name+'.ts'))+'\'');
  const url='data:text/javascript;base64,'+Buffer.from(bundled).toString('base64');urls.set(file,url);return url;
}
const {armMeshes,armCoverage,MELON_ARM_PATHS,MELON_ARM_CANVAS,MELON_GRIP_CROP}=await import(moduleUrl(resolve('src/world-preview/melon-arms.ts')));
const {MELON_EAT_DURATION,melonEatingPose}=await import(moduleUrl(resolve('src/world-preview/melon-motion.ts')));
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const triangles=[[0,1,2],[0,2,3]];
const neutral=armMeshes(0,0);
assert.equal(MELON_ARM_PATHS.length,2);assert.equal(neutral.length,2);
function quadAreas(points){return triangles.map(ids=>area(...ids.map(i=>points[i])))}
function convex(points,tag){
  const turns=points.map((p,i)=>area(p,points[(i+1)%4],points[(i+2)%4]));
  assert(turns.every(n=>n>.001)||turns.every(n=>n<-.001),tag+': painted quad must remain convex');
}

for(const mesh of neutral){
  for(const part of ['upper','lower']){
    const points=mesh[part].source,areas=quadAreas(points);
    convex(points,'Source arm'+mesh.arm+' '+part);
    assert(areas.every(n=>n>.001)||areas.every(n=>n<-.001),'Source quad triangles have consistent nonzero winding');
    for(const [x,y] of points){
      assert(x>=MELON_GRIP_CROP.x&&x<=MELON_GRIP_CROP.x+MELON_GRIP_CROP.width);
      assert(y>=MELON_GRIP_CROP.y&&y<=MELON_GRIP_CROP.y+MELON_GRIP_CROP.height);
    }
  }
  assert.deepEqual(mesh.hand.dest,mesh.hand.source,'Neutral clean hands preserve scene registration');
}

let checked=0,maxSpeed=0,minArea=Infinity;
for(const strength of [1,.28]){
  let previous=neutral;
  for(let frame=0;frame<=800;frame++){
    const age=MELON_EAT_DURATION*frame/800,pose=melonEatingPose(age);
    const meshes=armMeshes(pose.forearmX*strength,pose.forearmY*strength);
    const coverage=armCoverage(pose.forearmX*strength,pose.forearmY*strength);
    for(const mesh of meshes){
      const tag='strength='+strength+' age='+age.toFixed(3)+' arm'+mesh.arm;
      assert.deepEqual(mesh.upper.dest.slice(0,2),mesh.upper.source.slice(0,2),tag+': sleeve edge is locked to the original image');
      assert.deepEqual(coverage[mesh.arm].polygons,[mesh.upper.dest,mesh.lower.dest,mesh.hand.dest],tag+': coverage uses actual painted polygons');
      for(const part of ['upper','lower']){
        const points=mesh[part].dest,areas=quadAreas(points),baseAreas=quadAreas(neutral[mesh.arm][part].dest);
        convex(points,tag+' '+part);
        for(let i=0;i<areas.length;i++){
          minArea=Math.min(minArea,Math.abs(areas[i]));
          assert(Math.abs(areas[i])>.001&&Math.sign(areas[i])===Math.sign(baseAreas[i]),tag+': '+part+' triangle'+i+' folds or collapses (area='+areas[i]+')');
        }
        assert(Math.sign(areas[0])===Math.sign(areas[1]),tag+': quad triangles agree on winding');
      }
      for(const part of ['upper','lower','hand'])for(let i=0;i<mesh[part].dest.length;i++){
        const p=mesh[part].dest[i];
        assert(p.every(Number.isFinite),tag+': finite '+part+' coordinates');
        assert(p[0]>=MELON_ARM_CANVAS.x&&p[0]<=MELON_ARM_CANVAS.x+MELON_ARM_CANVAS.width&&p[1]>=MELON_ARM_CANVAS.y&&p[1]<=MELON_ARM_CANVAS.y+MELON_ARM_CANVAS.height,tag+': '+part+' fits the canvas');
        const speed=distance(p,previous[mesh.arm][part].dest[i])/.01;
        maxSpeed=Math.max(maxSpeed,speed);
        assert(speed<250,tag+': '+part+' moves continuously ('+speed.toFixed(2)+' scene px/s)');
      }
      for(let i=0;i<mesh.hand.source.length;i++)for(let j=i+1;j<mesh.hand.source.length;j++)assert(Math.abs(distance(mesh.hand.source[i],mesh.hand.source[j])-distance(mesh.hand.dest[i],mesh.hand.dest[j]))<1e-7,tag+': painted fingers retain their proportions');
    }
    previous=meshes;checked++;
  }
  for(const age of [-1,0,MELON_EAT_DURATION,MELON_EAT_DURATION+1]){
    const pose=melonEatingPose(age);
    assert.deepEqual(armMeshes(pose.forearmX*strength,pose.forearmY*strength),neutral,'Action endpoints return to registered neutral geometry');
  }
  for(const age of [0,MELON_EAT_DURATION])for(const delta of [-.001,.001]){
    const pose=melonEatingPose(age+delta),meshes=armMeshes(pose.forearmX*strength,pose.forearmY*strength);
    for(const mesh of meshes)for(const part of ['upper','lower','hand'])for(let i=0;i<mesh[part].dest.length;i++)assert(distance(mesh[part].dest[i],neutral[mesh.arm][part].dest[i])<1e-6,'No reset jump at either endpoint');
  }
}
console.log('PASS: '+checked+' actual normal/birthday poses, convex planes with consistent winding (min triangle area '+minArea.toFixed(2)+'), fixed cuffs, rigid hands, continuous endpoints (max speed '+maxSpeed.toFixed(1)+' scene px/s).');
