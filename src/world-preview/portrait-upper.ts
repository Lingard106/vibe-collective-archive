import {paintImageTriangle,type Point} from './portrait-head';
import {smooth,type PortraitPose} from './portrait-motion';

const X=280,Y=-220,W=1560,H=1220;
type Strip=readonly (readonly [Point,Point])[];
type Art={clip:string;rows:Strip};
const rest:Art[]=[
  {clip:'M644 435L716 450 742 536 767 624 746 642 784 759 829 879 791 918 748 935 712 921 677 861 694 820 677 651 675 610 669 520Z',rows:[[[644,435],[716,450]],[[675,650],[767,624]],[[692,764],[794,744]],[[710,850],[826,853]],[[708,911],[820,917]],[[745,946],[800,946]]]},
  {clip:'M418 418L643 426 677 459 687 520 676 647 701 847 363 847 381 648 416 642 437 498Z',rows:[[[418,418],[643,426]],[[416,500],[687,500]],[[381,648],[676,648]],[[363,847],[701,847]]]},
  {clip:'M310 417L429 432 438 497 414 642 393 650 365 776 369 891 332 935 276 935 195 882 212 788 263 631 245 618 268 538Z',rows:[[[310,417],[449,432]],[[245,618],[414,642]],[[225,735],[380,760]],[[199,856],[380,878]],[[206,901],[375,910]],[[230,946],[336,946]]]},
];
const raised:Art[]=[
  {clip:'M736 350L867 337 1037 273 1045 233 1063 221 1088 233 1081 270 1151 243 1197 277 1218 313 1167 374 1099 384 908 435 784 490 765 480Z',rows:[[[765,480],[736,350]],[[908,435],[867,337]],[[997,402],[954,306]],[[1105,385],[1040,205]],[[1198,370],[1160,230]],[[1230,340],[1230,250]]]},
  {clip:'M548 340L732 350 775 398 773 489 786 705H491L509 493 490 465 517 403Z',rows:[[[548,340],[732,350]],[[510,410],[775,398]],[[509,493],[773,489]],[[491,705],[786,705]]]},
  {clip:'M368 296L551 340 557 436 526 483 450 470 335 429 187 328 94 279 50 235 46 178 73 150 127 191 129 150 151 127 173 127 216 202 219 227 361 310Z',rows:[[[551,340],[526,483]],[[380,292],[335,429]],[[290,247],[247,377]],[[219,217],[183,328]],[[170,115],[84,295]],[[40,135],[50,270]]]},
];
export const UPPER_POSES={rest,raised};
const register=([x,y]:Point):Point=>[x*1.2-240,y*1.2+8];
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const angleMix=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const center=([a,b]:readonly [Point,Point]):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const plus=([x,y]:Point):Point=>[x+X,y-Y];

// Blend bone angles, not endpoint positions: the arms do not shrink mid-raise.
export function interpolateArm(a:Strip,b:Strip,t:number):Point[]{
  let previous:Point=[0,0];
  return a.flatMap((pair,i)=>{
    const ca=center(pair),cb=center(b[i]);
    let c:Point;
    if(i===0)c=[mix(ca[0],cb[0],t),mix(ca[1],cb[1],t)];
    else{
      const pa=center(a[i-1]),pb=center(b[i-1]);
      const va=[ca[0]-pa[0],ca[1]-pa[1]],vb=[cb[0]-pb[0],cb[1]-pb[1]];
      const angle=angleMix(Math.atan2(va[1],va[0]),Math.atan2(vb[1],vb[0]),t);
      const length=mix(Math.hypot(...va),Math.hypot(...vb),t);
      c=[previous[0]+Math.cos(angle)*length,previous[1]+Math.sin(angle)*length];
    }
    previous=c;
    const va=[pair[1][0]-pair[0][0],pair[1][1]-pair[0][1]],vb=[b[i][1][0]-b[i][0][0],b[i][1][1]-b[i][0][1]];
    const angle=angleMix(Math.atan2(va[1],va[0]),Math.atan2(vb[1],vb[0]),t);
    const radius=mix(Math.hypot(...va),Math.hypot(...vb),t)/2;
    const dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius;
    return [[c[0]-dx,c[1]-dy],[c[0]+dx,c[1]+dy]] as Point[];
  });
}

function rotateAfter(mesh:Point[],pivot:Point,angle:number,firstRow:number):Point[]{
  const radians=angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
  return mesh.map(([x,y],i)=>i<firstRow*2?[x,y]:[pivot[0]+(x-pivot[0])*c-(y-pivot[1])*s,pivot[1]+(x-pivot[0])*s+(y-pivot[1])*c]);
}
export function upperBodyMeshes(pose:PortraitPose):Point[][]{
  return rest.map((art,part)=>{
    const open=part===1?pose.torsoOpen:part===0?pose.rightOpen:pose.leftOpen;
    const rowsB=raised[part].rows.map(pair=>pair.map(register) as [Point,Point]),sourceB=rowsB.flat();
    if(part===1)return art.rows.flat().map((p,i)=>[mix(p[0],sourceB[i][0],open),mix(p[1],sourceB[i][1],open)] as Point);
    let mesh=interpolateArm(art.rows,rowsB,open);
    const shoulder=center([mesh[0],mesh[1]]);
    const idle=part===0?pose.rightArm+pose.armsOpen*86:pose.leftArm-pose.armsOpen*90;
    const shoulderLift=part===0?pose.rightLift:pose.leftLift;
    // Keep the sleeve's attachment edge on the torso; articulate the limb beyond it.
    mesh=rotateAfter(mesh,shoulder,idle+shoulderLift,1);
    const a=center([mesh[2],mesh[3]]),b=center([mesh[4],mesh[5]]);
    const elbow:Point=[mix(a[0],b[0],.4),mix(a[1],b[1],.4)];
    mesh=rotateAfter(mesh,elbow,part===0?pose.rightBend:pose.leftBend,2);
    return rotateAfter(mesh,center([mesh[6],mesh[7]]),part===0?pose.rightWrist:pose.leftWrist,4);
  });
}
function outline(mesh:Point[]){
  const left=mesh.filter((_,i)=>i%2===0),right=mesh.filter((_,i)=>i%2===1).reverse();
  return 'M'+[...left,...right].map(p=>p.join(' ')).join('L')+'Z';
}

export function createUpperBodyPainter(master:HTMLImageElement,celebration:HTMLImageElement,target:HTMLCanvasElement){
  target.width=W;target.height=H;
  const canvas=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c};
  const isolate=(image:HTMLImageElement,art:Art,isRaised:boolean)=>{
    const c=canvas(),ctx=c.getContext('2d')!;
    ctx.translate(X,-Y);if(isRaised)ctx.transform(1.2,0,0,1.2,-240,8);
    ctx.clip(new Path2D(art.clip));ctx.drawImage(image,0,0);return c;
  };
  const originals=rest.map(art=>isolate(master,art,false));
  const celebrations=raised.map(art=>isolate(celebration,art,true));
  const a=canvas(),b=canvas(),blend=canvas();
  const ac=a.getContext('2d')!,bc=b.getContext('2d')!,blendCtx=blend.getContext('2d')!,ctx=target.getContext('2d')!;
  let lastKey='',lastOutline='';
  const drawStrip=(context:CanvasRenderingContext2D,image:HTMLCanvasElement,src:Point[],dest:Point[])=>{
    context.clearRect(0,0,W,H);
    for(let i=0;i<src.length-2;i+=2){
      for(const indices of [[i,i+1,i+3],[i,i+3,i+2]])paintImageTriangle(context,image,indices.map(n=>plus(src[n])),indices.map(n=>plus(dest[n])));
    }
  };
  return(pose:PortraitPose)=>{
    const key=[pose.leftOpen,pose.rightOpen,pose.torsoOpen,pose.leftArm,pose.rightArm,pose.armsOpen,pose.leftBend,pose.rightBend,pose.leftLift,pose.rightLift,pose.leftWrist,pose.rightWrist].map(n=>n.toFixed(3)).join();
    if(key===lastKey)return lastOutline;
    lastKey=key;
    const meshes=upperBodyMeshes(pose);
    lastOutline=outline(meshes[0])+outline(meshes[2]);
    ctx.clearRect(0,0,W,H);
    for(let part=0;part<3;part++){
      const sourceA=rest[part].rows.flat(),rowsB=raised[part].rows.map(pair=>pair.map(register) as [Point,Point]);
      const sourceB=rowsB.flat();
      const dest=meshes[part],open=part===1?pose.torsoOpen:part===0?pose.rightOpen:pose.leftOpen;
      const bend=part===0?pose.rightBend:pose.leftBend,wrist=part===0?pose.rightWrist:pose.leftWrist,lift=part===0?pose.rightLift:pose.leftLift;
      // Neutral idle only needs rigid arm motion; preserve every source pixel
      // instead of re-rasterizing dozens of triangles for an unchanged pose.
      if(open===0&&(part===1||(bend===0&&wrist===0&&lift===0))){
        ctx.save();
        if(part!==1){
          const [px,py]=plus(center(rest[part].rows[0]));
          const angle=part===0?pose.rightArm+pose.armsOpen*86:pose.leftArm-pose.armsOpen*90;
          ctx.translate(px,py);ctx.rotate(angle*Math.PI/180);ctx.translate(-px,-py);
        }
        ctx.drawImage(originals[part],0,0);ctx.restore();continue;
      }
      const texture=smooth((open-.1)/.8);
      if(texture<1)drawStrip(ac,originals[part],sourceA,dest);
      if(texture>0)drawStrip(bc,celebrations[part],sourceB,dest);
      blendCtx.clearRect(0,0,W,H);blendCtx.globalCompositeOperation='source-over';
      if(texture<1){blendCtx.globalAlpha=1-texture;blendCtx.drawImage(a,0,0)}
      if(texture>0){blendCtx.globalCompositeOperation='lighter';blendCtx.globalAlpha=texture;blendCtx.drawImage(b,0,0)}
      blendCtx.globalAlpha=1;blendCtx.globalCompositeOperation='source-over';
      ctx.drawImage(blend,0,0);
    }
    return lastOutline;
  };
}
