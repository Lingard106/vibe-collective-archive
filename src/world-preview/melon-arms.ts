import {paintImageTriangle,type Point} from './portrait-head';

// Forearms and hands only. The sleeve edges remain on the original portrait.
export const MELON_ARM_PATHS=[
  'M307 529L352 548L354 569L412 593L418 607L410 631L394 643L360 638L311 616L285 596L285 546Z',
  'M517 539L545 538L559 579L574 589L583 610L574 631L548 642L531 631L530 613L518 590Z',
] as const;
type Bone={root:Point;elbow:Point;wrist:Point;side:1|-1};
type Part={arm:0|1;kind:'upper'|'lower'|'hand';clip:string;bounds:readonly[number,number,number,number]};
const BONES:readonly Bone[]=[
  {root:[318,541],elbow:[313,584],wrist:[354,606],side:1},
  {root:[531,541],elbow:[548,572],wrist:[551,603],side:-1},
];
// The pieces overlap around elbow and wrist, just as layered painted animation
// cels do. The palm stays rigid with the melon instead of twisting its grip.
const PARTS:readonly Part[]=[
  {arm:1,kind:'upper',clip:'M517 539L545 538L558 577L556 599L530 613L518 590Z',bounds:[514,535,48,81]},
  {arm:1,kind:'lower',clip:'M523 561L553 562L565 589L562 614L539 630L530 613Z',bounds:[520,558,48,75]},
  {arm:1,kind:'hand',clip:'M551 584L574 589L583 610L574 631L548 642L533 630L535 610Z',bounds:[530,581,56,64]},
  {arm:0,kind:'upper',clip:'M307 532L352 550L354 565L345 588L285 581L285 546Z',bounds:[282,526,76,85]},
  {arm:0,kind:'lower',clip:'M285 580L338 568L357 583L363 608L341 623L309 612L285 596Z',bounds:[282,559,85,73]},
  {arm:0,kind:'hand',clip:'M351 579L414 593L418 607L410 631L394 643L360 638L340 629Z',bounds:[337,576,84,70]},
];
const distance=(a:Point,b:Point)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const angle=(a:Point,b:Point)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
const FRUIT='M367 531L390 528L565 539L570 559L565 580L554 604L536 624L510 637L475 644L441 638L413 625L390 606L378 584L370 559Z';
// The far forearm is hidden by the fruit in the original painting. Reconstruct
// that newly revealed skin using the original near-arm texture, not fruit pixels.
export function isMelonTexture(r:number,g:number,b:number){
  return (r>g*1.55&&r>b*1.4)||(g>b*1.45&&r<g*1.45&&r<150);
}

// Analytic two-link IK: keep the elbow on its original side of the shoulder /
// wrist axis. The supported movement remains strictly inside the reach circle.
function elbowAt(bone:Bone,target:Point):Point{
  const upper=distance(bone.root,bone.elbow),lower=distance(bone.elbow,bone.wrist);
  const dx=target[0]-bone.root[0],dy=target[1]-bone.root[1],raw=Math.hypot(dx,dy);
  const d=Math.max(Math.abs(upper-lower)+.01,Math.min(upper+lower-.01,raw));
  const ux=dx/(raw||1),uy=dy/(raw||1);
  const along=(upper*upper+d*d-lower*lower)/(2*d);
  const across=Math.sqrt(Math.max(0,upper*upper-along*along))*bone.side;
  return[bone.root[0]+ux*along-uy*across,bone.root[1]+uy*along+ux*across];
}
function move(point:Point,source:Point,destination:Point,radians:number):Point{
  const x=point[0]-source[0],y=point[1]-source[1],c=Math.cos(radians),s=Math.sin(radians);
  return[destination[0]+x*c-y*s,destination[1]+x*s+y*c];
}
export function armMeshes(dx:number,dy:number){
  return PARTS.map(part=>{
    const bone=BONES[part.arm],target:Point=[bone.wrist[0]+dx,bone.wrist[1]+dy];
    const elbow=dx===0&&dy===0?bone.elbow:elbowAt(bone,target);
    const [x,y,w,h]=part.bounds;
    const source:Point[]=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
    const dest=source.map(point=>{
      if(part.kind==='hand')return[point[0]+dx,point[1]+dy] as Point;
      if(part.kind==='upper')return move(point,bone.root,bone.root,angle(bone.root,elbow)-angle(bone.root,bone.elbow));
      return move(point,bone.elbow,elbow,angle(elbow,target)-angle(bone.elbow,bone.wrist));
    });
    return{arm:part.arm,kind:part.kind,source,dest,root:bone.root,elbow,wrist:target};
  });
}

// Target has full 1672 x 940 scene registration. Each source cel is a tiny crop,
// not another full-scene canvas. No source resolution or texture is reduced.
export function createMelonArmsPainter(image:HTMLImageElement,target:HTMLCanvasElement){
  target.width=1672;target.height=940;
  const ctx=target.getContext('2d')!;
  const skin=document.createElement('canvas');skin.width=32;skin.height=24;
  skin.getContext('2d')!.drawImage(image,296,550,32,24,0,0,32,24);
  const cels=PARTS.map(part=>{
    const [x,y,w,h]=part.bounds,c=document.createElement('canvas');c.width=w;c.height=h;
    const context=c.getContext('2d')!;
    context.translate(-x,-y);context.clip(new Path2D(part.clip));context.drawImage(image,0,0);
    if(part.kind!=='hand'){
      context.save();context.clip(new Path2D(FRUIT));
      context.fillStyle=context.createPattern(skin,'repeat')!;
      // The far arm is slightly shaded relative to the near arm in this scene.
      context.filter=part.arm===1?'brightness(.88) saturate(.9)':'none';
      context.fillRect(x,y,w,h);context.restore();
    }else{
      // The polygon boundary crosses a few rind/red pixels beside the fingers.
      // Keep the painted fingers intact and replace only those fruit-colour
      // flecks with a sample of the same original skin texture.
      const pixels=context.getImageData(0,0,w,h),sample=skin.getContext('2d')!.getImageData(0,0,32,24).data;
      for(let py=0;py<h;py++)for(let px=0;px<w;px++){
        const i=(py*w+px)*4;if(!pixels.data[i+3]||!isMelonTexture(pixels.data[i],pixels.data[i+1],pixels.data[i+2]))continue;
        const si=((py%24)*32+(px%32))*4;
        for(let channel=0;channel<3;channel++)pixels.data[i+channel]=sample[si+channel]*(part.arm===1?.88:1);
      }
      context.putImageData(pixels,0,0);
    }
    return c;
  });
  let last='';
  return(dx:number,dy:number)=>{
    const key=`${dx.toFixed(3)},${dy.toFixed(3)}`;if(key===last)return;last=key;
    ctx.clearRect(0,0,1672,940);
    armMeshes(dx,dy).forEach((mesh,index)=>{
      const cel=cels[index];
      if(dx===0&&dy===0){ctx.drawImage(cel,PARTS[index].bounds[0],PARTS[index].bounds[1]);return}
      const source:Point[]=[[0,0],[cel.width,0],[cel.width,cel.height],[0,cel.height]];
      for(const ids of [[0,1,2],[0,2,3]])paintImageTriangle(ctx,cel,ids.map(i=>source[i]),ids.map(i=>mesh.dest[i]));
    });
  };
}
