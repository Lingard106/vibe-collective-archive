import {paintImageTriangle,type Point} from './portrait-head';

export const MELON_ARM_CANVAS={x:260,y:380,width:360,height:290} as const;
export const MELON_GRIP_CROP={x:270,y:420,width:325,height:234} as const;
export const MELON_ARM_PATHS=[
  'M307 529L352 548L354 569L412 593L418 607L410 631L394 643L360 638L311 616L285 596L285 546Z',
  'M517 539L545 538L559 579L574 589L583 610L574 631L548 642L531 631L530 613L518 590Z',
] as const;
type Quad=readonly[Point,Point,Point,Point];
const UPPER:readonly Quad[]=[
  [[307,530],[351,548],[342,586],[285,598]],
  [[517,541],[545,538],[558,587],[519,609]],
];
const RAISED_UPPER:readonly Quad[]=[
  [[307,530],[351,548],[323,575],[278,551]],
  [[517,541],[545,538],[587,551],[551,575]],
];
// Long, complete forearm surfaces from the raised reference, never repeated
// skin tiles. Perspective changes are carried by each convex painted plane.
const FOREARM:readonly Quad[]=[
  [[317,561],[295,543],[353,473],[372,492]],
  [[546,552],[570,541],[546,474],[529,485]],
];
const ELBOW:readonly Point[]=[[313,590],[561,580]];
const RAISED_ELBOW:readonly Point[]=[[300,563],[568,563]];
const WRIST:readonly Point[]=[[355,607],[542,608]];
const GRIPS:readonly Point[]=[[387,610],[555,610]];
const HANDS:readonly(readonly Point[])[]=[
  [[363,575],[380,571],[399,577],[398,587],[415,594],[416,603],[411,634],[398,642],[370,642],[354,637],[349,616]],
  [[537,574],[550,573],[564,580],[567,587],[580,592],[580,602],[575,630],[560,638],[539,636],[526,624],[528,612],[532,599]],
];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
function rotate([x,y]:Point,[cx,cy]:Point,r:number):Point{
  return[cx+(x-cx)*Math.cos(r)-(y-cy)*Math.sin(r),cy+(x-cx)*Math.sin(r)+(y-cy)*Math.cos(r)];
}
function ribbon(a:Point,b:Point,width:number):Quad{
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/length*width/2,ny=(b[0]-a[0])/length*width/2;
  // Extend into the upper arm and palm. These are real painted surfaces, not
  // independently fading patches, and retain solid coverage through a bend.
  const ux=(b[0]-a[0])/length*7,uy=(b[1]-a[1])/length*7;
  return[[a[0]-ux+nx,a[1]-uy+ny],[a[0]-ux-nx,a[1]-uy-ny],[b[0]+ux-nx,b[1]+uy-ny],[b[0]+ux+nx,b[1]+uy+ny]];
}
export function armMeshes(dx:number,dy:number){
  const lift=clamp(-dy/112);
  return UPPER.map((source,arm)=>{
    const radians=(arm===0?-.2:.16)*lift,grip=GRIPS[arm];
    const move=(p:Point):Point=>{const q=rotate(p,grip,radians);return[q[0]+dx,q[1]+dy]};
    const elbow=mix(ELBOW[arm],RAISED_ELBOW[arm],lift),wrist=move(WRIST[arm]);
    const upper=source.map((p,i)=>mix(p,RAISED_UPPER[arm][i],lift)) as unknown as Quad;
    const lower=ribbon(elbow,wrist,arm===0?44:31);
    const hand=HANDS[arm].map(move);
    return{arm,upper:{source,dest:upper},lower:{source:FOREARM[arm],dest:lower},hand:{source:HANDS[arm],dest:hand},elbow,wrist};
  });
}
export function armCoverage(dx:number,dy:number){
  return armMeshes(dx,dy).map(({arm,upper,lower,hand})=>({arm,polygons:[upper.dest,lower.dest,hand.dest]}));
}
function path(points:readonly Point[]){
  const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;
}

// Upper arms + forearms are behind the food. Complete clean fingers are in
// front. Art is native-resolution lossless WebP, never recoloured/classified.
export function createMelonArmsPainter(cleanGrip:HTMLImageElement,raisedGrip:HTMLImageElement,back:HTMLCanvasElement,front:HTMLCanvasElement){
  for(const target of [back,front]){target.width=MELON_ARM_CANVAS.width;target.height=MELON_ARM_CANVAS.height}
  const body=back.getContext('2d')!,fingers=front.getContext('2d')!;
  const local=(p:Point):Point=>[p[0]-MELON_ARM_CANVAS.x,p[1]-MELON_ARM_CANVAS.y];
  const crop=(p:Point):Point=>[p[0]-MELON_GRIP_CROP.x,p[1]-MELON_GRIP_CROP.y];
  const quad=(image:HTMLImageElement,src:Quad,dst:Quad)=>{
    body.save();body.clip(path(dst.map(local)));
    // A wider internal overlap seals anti-aliased diagonal cracks. The outer
    // quad clip keeps its silhouette sharp, without growing the painted arm.
    for(const ids of [[0,1,2],[0,2,3]])paintImageTriangle(body,image,ids.map(i=>crop(src[i])),ids.map(i=>local(dst[i])),3.2);
    body.restore();
  };
  let last='';
  return(dx:number,dy:number)=>{
    const key=`${dx.toFixed(3)},${dy.toFixed(3)}`;if(key===last)return;last=key;
    body.clearRect(0,0,back.width,back.height);fingers.clearRect(0,0,front.width,front.height);
    for(const mesh of armMeshes(dx,dy)){
      quad(cleanGrip,mesh.upper.source,mesh.upper.dest);
      quad(raisedGrip,mesh.lower.source,mesh.lower.dest);
      const p=mesh.hand.source,q=mesh.hand.dest;
      const radians=Math.atan2(q[1][1]-q[0][1],q[1][0]-q[0][0])-Math.atan2(p[1][1]-p[0][1],p[1][0]-p[0][0]);
      const c=Math.cos(radians),s=Math.sin(radians);
      fingers.save();fingers.clip(path(q.map(local)));
      fingers.setTransform(c,s,-s,c,q[0][0]-MELON_ARM_CANVAS.x-c*(p[0][0]-MELON_GRIP_CROP.x)+s*(p[0][1]-MELON_GRIP_CROP.y),q[0][1]-MELON_ARM_CANVAS.y-s*(p[0][0]-MELON_GRIP_CROP.x)-c*(p[0][1]-MELON_GRIP_CROP.y));
      fingers.drawImage(cleanGrip,0,0);fingers.restore();
    }
  };
}
