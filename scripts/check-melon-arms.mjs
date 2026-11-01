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
const {armMeshes,MELON_ARM_PATHS,isMelonTexture}=await import(moduleUrl(resolve('src/world-preview/melon-arms.ts')));
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
assert.equal(MELON_ARM_PATHS.length,2);
assert(isMelonTexture(219,76,53),'Red flesh is not arm texture');
assert(isMelonTexture(96,111,49),'Green rind is not arm texture');
assert(!isMelonTexture(239,186,146),'Painted fingers retain original skin detail');
assert(!isMelonTexture(218,165,122),'Shaded painted fingers retain skin detail');
for(const mesh of armMeshes(0,0))assert.deepEqual(mesh.dest,mesh.source,'Neutral cels preserve exact registration');
for(let dx=-16;dx<=0;dx+=2)for(let dy=-120;dy<=0;dy+=2){
  for(const mesh of armMeshes(dx,dy)){
    for(const point of mesh.dest){assert(point.every(Number.isFinite));assert(point[0]>100&&point[0]<750&&point[1]>350&&point[1]<750,'Arm cel fits scene');}
    for(const ids of [[0,1,2],[0,2,3]])assert(area(...ids.map(i=>mesh.dest[i]))>0,'No painted piece folds');
    for(let i=0;i<4;i++)assert(Math.abs(Math.hypot(mesh.dest[i][0]-mesh.dest[(i+1)%4][0],mesh.dest[i][1]-mesh.dest[(i+1)%4][1])-Math.hypot(mesh.source[i][0]-mesh.source[(i+1)%4][0],mesh.source[i][1]-mesh.source[(i+1)%4][1]))<1e-8,'Rigid painted cel retains detail proportions');
    if(mesh.kind==='hand')mesh.dest.forEach((p,i)=>{assert(Math.abs(p[0]-mesh.source[i][0]-dx)<1e-8);assert(Math.abs(p[1]-mesh.source[i][1]-dy)<1e-8);});
    if(mesh.kind==='upper'){
      const sourceOrigin=mesh.root;
      // Both upper-bone lengths stay at rest; the sleeve attachment is its pivot.
      const neutral=armMeshes(0,0).find(m=>m.arm===mesh.arm&&m.kind==='upper');
      assert(Math.abs(Math.hypot(mesh.elbow[0]-sourceOrigin[0],mesh.elbow[1]-sourceOrigin[1])-Math.hypot(neutral.elbow[0]-sourceOrigin[0],neutral.elbow[1]-sourceOrigin[1]))<1e-8);
    }
  }
}
console.log('PASS: original-texture arm cels, fixed sleeve pivots, rigid grips track melon, no fold/clipping across eating reach.');
