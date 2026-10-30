export type Point=readonly[number,number];
type View={neckX:number;openY:number;closedY:number;bounds:readonly[number,number,number,number];eyes:readonly[Point,Point,Point,Point,Point,Point,Point,Point];chin:readonly[number,number,number,number];mouth:readonly[Point,Point]};
export const HEAD_WIDTH=440,HEAD_HEIGHT=390;
// Landmarks are measured in a neck-registered head space, not bounding-box centers.
// The generator's ten cells are not uniformly angled; only three distinct views are used.
export const HEAD_VIEWS:readonly View[]=[
  {neckX:1764,openY:366,closedY:760,bounds:[1576,13,387,355],
    eyes:[[69,210],[127,200],[169,194],[236,185],[69,267],[127,260],[169,254],[236,245]],chin:[72,110,170,214],mouth:[[124,284],[170,278]]},
  {neckX:995,openY:366,closedY:760,bounds:[830,24,330,346],
    eyes:[[134,198],[208,198],[246,198],[319,198],[134,257],[208,257],[246,257],[319,257]],chin:[124,185,260,321],mouth:[[194,284],[251,284]]},
  {neckX:220,openY:366,closedY:760,bounds:[21,12,386,357],
    eyes:[[212,194],[277,203],[311,205],[371,213],[212,248],[277,257],[311,260],[371,268]],chin:[214,260,310,361],mouth:[[269,280],[315,286]]},
];
export function headMesh(view:View):Point[]{
  const e=view.eyes,m=view.mouth,hairLeft=view.bounds[0]-view.neckX+220,hairRight=hairLeft+view.bounds[2];
  return[
    ...[0,88,176,264,352,440].map(x=>[x,0] as Point),
    ...[0,hairLeft+12,hairLeft+(hairRight-hairLeft)*.36,hairLeft+(hairRight-hairLeft)*.64,hairRight-12,440].map(x=>[x,80] as Point),
    [0,150],[e[0][0]-20,166],[e[1][0]-12,150],[e[2][0]+12,150],[e[3][0]+20,166],[440,150],
    [0,200],e[0],e[1],e[2],e[3],[440,200],
    [0,275],e[4],e[5],e[6],e[7],[440,275],
    [0,307],[m[0][0]-36,306],m[0],m[1],[m[1][0]+36,306],[440,307],
    [0,336],...[...view.chin].map(x=>[x,334] as Point),[440,336],
    ...[0,88,176,264,352,440].map(x=>[x,390] as Point),
  ];
}
export const HEAD_TRIANGLES:readonly(readonly[number,number,number])[]=Array.from({length:35},(_,i)=>{
  const row=Math.floor(i/5),col=i%5,a=row*6+col;
  return [[a,a+1,a+7],[a,a+7,a+6]] as const;
}).flat();
export function headBlend(yaw:number){
  const bounded=Math.max(-1,Math.min(1,yaw));
  return bounded<0?{a:0,b:1,t:bounded+1}:{a:1,b:2,t:bounded};
}
export function interpolateMesh(a:readonly Point[],b:readonly Point[],t:number):Point[]{
  return a.map((p,i)=>[p[0]+(b[i][0]-p[0])*t,p[1]+(b[i][1]-p[1])*t]);
}
export function smilingMesh(mesh:Point[],smile:number):Point[]{
  return mesh.map(([x,y],i)=>i===32?[x-smile*3,y-smile*2.8]:i===33?[x+smile*3,y-smile*2.8]:[x,y]);
}
export function animatedHeadMesh(yaw:number,smile=0):Point[]{
  const turn=Math.max(-.52,Math.min(.42,yaw-.3));
  return smilingMesh(headMesh(HEAD_VIEWS[2]).map(([x,y],i)=>{
    const row=Math.floor(i/6),col=i%6;
    const weight=col>0&&col<5?(row===3||row===4?1:row===5?.9:row===6?.5:0):0;
    return[x+turn*(20+(x-292)*.065)*weight,y];
  }),smile);
}
function canvas(){const el=document.createElement('canvas');el.width=HEAD_WIDTH;el.height=HEAD_HEIGHT;return el}
export function paintImageTriangle(ctx:CanvasRenderingContext2D,image:CanvasImageSource,src:readonly Point[],dst:readonly Point[]){
  const [[x0,y0],[x1,y1],[x2,y2]]=src,[[u0,v0],[u1,v1],[u2,v2]]=dst;
  const den=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);
  if(Math.abs(den)<.001)return;
  const a=(u0*(y1-y2)+u1*(y2-y0)+u2*(y0-y1))/den;
  const c=(u0*(x2-x1)+u1*(x0-x2)+u2*(x1-x0))/den;
  const e=(u0*(x1*y2-x2*y1)+u1*(x2*y0-x0*y2)+u2*(x0*y1-x1*y0))/den;
  const b=(v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/den;
  const d=(v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/den;
  const f=(v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/den;
  ctx.save();ctx.beginPath();
  // Slightly overlap raster triangle edges to avoid bright subpixel cracks.
  const cx=(u0+u1+u2)/3,cy=(v0+v1+v2)/3;
  dst.forEach(([x,y],i)=>{const length=Math.hypot(x-cx,y-cy)||1;const px=x+(x-cx)/length*.45,py=y+(y-cy)/length*.45;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py)});
  ctx.closePath();ctx.clip();ctx.setTransform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
}
export function createHeadPainter(atlas:HTMLImageElement,target:HTMLCanvasElement){
  target.width=HEAD_WIDTH;target.height=HEAD_HEIGHT;
  const context=target.getContext('2d')!;
  const meshes=HEAD_VIEWS.map(headMesh);
  const source=HEAD_VIEWS.map(view=>[false,true].map(closed=>{
    const image=canvas(),ctx=image.getContext('2d')!;
    const neckY=closed?view.closedY:view.openY;
    const [x,y,w,h]=view.bounds;
    ctx.save();ctx.beginPath();ctx.rect(x-view.neckX+220,y-view.openY+370,w,h+2);ctx.clip();
    ctx.drawImage(atlas,220-view.neckX,370-neckY);ctx.restore();return image;
  }));
  const open=canvas(),closed=canvas();
  const warp=(out:HTMLCanvasElement,image:HTMLCanvasElement,src:Point[],dst:Point[])=>{
    const ctx=out.getContext('2d')!;ctx.clearRect(0,0,HEAD_WIDTH,HEAD_HEIGHT);
    for(const indexes of HEAD_TRIANGLES)paintImageTriangle(ctx,image,indexes.map(i=>src[i]),indexes.map(i=>dst[i]));
  };
  let lastYaw=100,lastBlink=100,lastSmile=100;
  return(yaw:number,blink:number,smile=0)=>{
    if(Math.abs(yaw-lastYaw)<.0015&&Math.abs(blink-lastBlink)<.008&&Math.abs(smile-lastSmile)<.005)return;
    lastYaw=yaw;lastBlink=blink;lastSmile=smile;
    // Keep a single coherent painted head. Independently generated angles have
    // different hair blocks and jawlines: dissolving them creates ghost edges.
    // Small head turns use rigid outer hair + bounded inner facial parallax.
    const dest=animatedHeadMesh(yaw,smile);
    warp(open,source[2][0],meshes[2],dest);
    context.clearRect(0,0,HEAD_WIDTH,HEAD_HEIGHT);context.drawImage(open,0,0);
    if(blink>.005){
      warp(closed,source[2][1],meshes[2],dest);
      // Only replace lens interiors: a blink must not swap the hair, jaw or smile.
      context.save();context.beginPath();
      for(const [tl,tr,br,bl]of [[19,20,26,25],[21,22,28,27]]){
        const points=[dest[tl],dest[tr],dest[br],dest[bl]],cx=points.reduce((n,p)=>n+p[0],0)/4,cy=points.reduce((n,p)=>n+p[1],0)/4;
        points.forEach(([x,y],i)=>{const px=cx+(x-cx)*.85,py=cy+(y-cy)*.79;if(i)context.lineTo(px,py);else context.moveTo(px,py)});context.closePath();
      }
      context.clip();context.globalAlpha=blink;context.drawImage(closed,0,0);context.restore();
    }
  };
}
