import {paintImageTriangle,type Point} from './portrait-head';
import {GREETING_MOVE} from './portrait-motion';
type Walk={approach:number;leftStep:number;rightStep:number;leftTravel:number;rightTravel:number;legSpread:number;tiptoe:number};
const rows=[0,170,370,510,654,700],xs=[0,256,480,544,784,1024];
export const BODY_MESH:Point[]=rows.flatMap(y=>xs.map(x=>[x,y] as Point));
export const BODY_TRIANGLES=Array.from({length:rows.length-1},(_,row)=>Array.from({length:xs.length-1},(_,col)=>{
  const a=row*xs.length+col,b=a+xs.length;
  return [[a,a+1,b+1],[a,b+1,b]];
})).flat(2);

export function lowerBodyMesh(hipX:number,hipY:number,roll:number,walk:Walk):Point[]{
  const weights=[1,.65,.12,0,0,0],radians=roll*Math.PI/180;
  const {leftStep,rightStep,leftTravel,rightTravel,approach,legSpread,tiptoe}=walk;
  return BODY_MESH.map(([x,y],i)=>{
    const row=Math.floor(i/xs.length),weight=weights[row];
    const foot=x<=480?leftStep:rightStep,travel=x<=480?leftTravel:rightTravel,walkWeight=[0,.16,.7,1,1,1][row];
    const scale=1+approach*GREETING_MOVE.scale;
    // Compensate for the moving torso so the supporting shoe does not slide.
    const dx=(GREETING_MOVE.x*(travel-approach)-(x-555)*(scale-1))/scale;
    const dy=(GREETING_MOVE.y*(travel-approach)-(y+836-1490)*(scale-1)-foot*44)/scale;
    return[x+hipX*weight+(dx+(x<=480?-1:1)*legSpread)*walkWeight,y+(hipY+(x-555)*radians)*weight+dy*walkWeight+tiptoe*14*[0,0,0,0,1,1][row]];
  });
}

// Hip and knee weights preserve planted feet at rest, with separate walking lifts.
export function createLowerBodyPainter(master:HTMLImageElement,target:HTMLCanvasElement){
  target.width=1024;target.height=700;
  const source=document.createElement('canvas');source.width=1024;source.height=700;
  const src=source.getContext('2d')!,ctx=target.getContext('2d')!;
  src.save();src.translate(0,-836);
  src.clip(new Path2D('M365 836H697L703 928 752 1190 776 1320 858 1390 858 1536H230V1370L285 1280 317 1100 325 980Z'));
  src.drawImage(master,0,0);src.restore();
  let lastKey='';
  return(hipX:number,hipY:number,roll:number,walk:Walk)=>{
    const key=[hipX,hipY,roll,walk.approach,walk.leftStep,walk.rightStep,walk.leftTravel,walk.rightTravel,walk.legSpread,walk.tiptoe].map(n=>n.toFixed(3)).join();
    if(key===lastKey)return;lastKey=key;
    const dest=lowerBodyMesh(hipX,hipY,roll,walk);
    ctx.clearRect(0,0,1024,700);
    const planted=walk.approach===0&&walk.leftStep===0&&walk.rightStep===0&&walk.legSpread===0&&walk.tiptoe===0;
    if(planted)ctx.drawImage(source,0,510,1024,190,0,510,1024,190);
    for(const ids of planted?BODY_TRIANGLES.slice(0,30):BODY_TRIANGLES)paintImageTriangle(ctx,source,ids.map(i=>BODY_MESH[i]),ids.map(i=>dest[i]));
  };
}
