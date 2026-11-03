import {paintImageTriangle,type Point} from './portrait-head';
import type {JudefanPose} from './judefan-motion';

// Upward padding changes only the buffer origin, not the grounded scene pose.
export const JUDEFAN_CANVAS={width:665,height:684,top:-64} as const;
const TOP_PAD=-JUDEFAN_CANVAS.top;
type Quad=readonly[Point,Point,Point,Point];
type Cel={image:HTMLCanvasElement;x:number;y:number};
type Arm={shoulder:Point;elbow:Point;wrist:Point};
const HIP:Point=[375,338],NECK:Point=[371,165];
const ORIGINS:readonly Point[]=[[0,0],[665,0],[0,591],[665,591]];
const HEAD:readonly Point[]=[[344,25],[410,25],[410,32],[432,36],[432,49],[436,50],[437,145],[398,155],[394,173],[371,177],[352,170],[350,160],[305,164],[303,156],[296,154],[294,148],[291,145],[290,136],[286,134],[285,111],[284,107],[284,65],[291,59],[291,53],[306,46],[309,41],[328,34],[337,29]];
const TORSO:readonly Point[]=[[308,170],[347,162],[371,171],[393,161],[438,175],[436,256],[444,336],[409,339],[399,333],[366,334],[359,341],[308,338],[316,258]];
const ARMS:readonly Arm[]=[{shoulder:[297,194],elbow:[283,258],wrist:[276,326]},{shoulder:[440,190],elbow:[455,255],wrist:[466,324]}];
const UPPER:readonly(readonly Point[])[]=[[[286,178],[317,195],[315,263],[307,275],[257,264],[264,240]],[[434,177],[448,193],[467,251],[465,271],[443,270],[436,232]]];
const LOWER:readonly(readonly Point[])[]=[[[260,248],[314,259],[307,335],[250,330],[250,310]],[[444,249],[466,245],[484,318],[484,324],[450,337],[446,306]]];
const HAND_NEUTRAL:readonly(readonly Point[])[]=[[[253,336],[300,341],[301,357],[292,370],[277,373],[255,366],[252,353]],[[449,333],[482,321],[484,344],[477,357],[463,362],[449,356]]];
const HAND_ORIGINAL:readonly(readonly Point[])[]=[[[396,177],[409,175],[425,179],[425,183],[414,186],[418,193],[417,219],[406,225],[395,222]],[[524,103],[550,90],[573,82],[576,96],[551,110],[560,123],[563,135],[548,145],[536,143],[530,127]]];
const HAND_LAUGH:readonly(readonly Point[])[]=[[[303,258],[319,256],[326,260],[334,264],[334,270],[330,274],[333,278],[330,285],[331,290],[328,298],[316,300],[301,295]],[[333,253],[345,253],[361,261],[366,279],[354,291],[335,297],[330,292],[334,285],[331,278],[334,272],[330,266]]];
const HAND_SALUTE:readonly(readonly Point[])[]=[[[249,248],[267,246],[289,251],[291,257],[287,260],[291,264],[287,269],[290,273],[287,279],[280,289],[253,290],[246,281]],[[503,151],[508,146],[514,149],[521,130],[529,119],[536,117],[541,121],[546,117],[552,120],[554,125],[561,126],[565,135],[567,145],[561,158],[549,177],[537,193],[519,197],[505,192]]];
const THIGHS:readonly(readonly Point[])[]=[[[312,337],[369,338],[349,407],[341,439],[282,434],[295,387]],[[369,338],[439,336],[447,379],[459,432],[399,439],[383,388]]];
const SHINS:readonly(readonly Point[])[]=[[[284,426],[342,433],[331,511],[329,518],[264,522],[273,472]],[[399,430],[458,425],[471,503],[473,515],[395,520],[393,473]]];
const SHOES:readonly(readonly Point[])[]=[[[274,507],[327,513],[340,530],[339,562],[319,568],[250,568],[250,542],[264,523]],[[397,508],[471,504],[484,525],[484,561],[448,566],[395,560],[395,530]]];
const HIPS:readonly Point[]=[[337,346],[408,346]],KNEES:readonly Point[]=[[312,431],[428,431]],ANKLES:readonly Point[]=[[305,510],[435,510]];
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const add=(a:Point,b:Point):Point=>[a[0]+b[0],a[1]+b[1]];
const angle=(a:Point,b:Point)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
function rotate(p:Point,pivot:Point,radians:number):Point{const x=p[0]-pivot[0],y=p[1]-pivot[1];return[pivot[0]+x*Math.cos(radians)-y*Math.sin(radians),pivot[1]+x*Math.sin(radians)+y*Math.cos(radians)]}
function polygon(points:readonly Point[]){const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p}
function blendPoint(rest:Point,laugh:Point,original:Point,salute:Point,pose:JudefanPose):Point{
  return[rest[0]+(laugh[0]-rest[0])*pose.laugh+(original[0]-rest[0])*pose.original+(salute[0]-rest[0])*pose.salute,rest[1]+(laugh[1]-rest[1])*pose.laugh+(original[1]-rest[1])*pose.original+(salute[1]-rest[1])*pose.salute];
}
function centroid(points:readonly Point[]):Point{
  let area=0,x=0,y=0;
  points.forEach((a,i)=>{const b=points[(i+1)%points.length],cross=a[0]*b[1]-b[0]*a[1];area+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross});
  return[x/(3*area),y/(3*area)];
}
function radialContour(points:readonly Point[],center:Point,axis:number):Point[]{
  return Array.from({length:16},(_,index)=>{
    const radians=axis+index*Math.PI/8,ux=Math.cos(radians),uy=Math.sin(radians);
    let furthest=0;
    points.forEach((a,i)=>{
      const b=points[(i+1)%points.length],vx=b[0]-a[0],vy=b[1]-a[1],den=ux*vy-uy*vx;
      if(Math.abs(den)<1e-7)return;
      const ax=a[0]-center[0],ay=a[1]-center[1],ray=(ax*vy-ay*vx)/den,edge=(ax*uy-ay*ux)/den;
      if(ray>=0&&edge>=-1e-7&&edge<=1+1e-7)furthest=Math.max(furthest,ray);
    });
    // Stay inside the native painted contour rather than sampling its alpha
    // fringe. Endpoint poses retain their exact original hand silhouette.
    const radius=Math.max(.25,furthest-.6);
    return[center[0]+ux*radius,center[1]+uy*radius];
  });
}

/** Geometry is in the neutral cell's coordinate system; feet retain y=570. */
export function judefanRig(pose:JudefanPose,time:number){
  const crouch=pose.knees*9+pose.anticipation*11+pose.landing*14,bodyY=pose.bodyY+pose.breath+crouch+pose.jumpY,roll=pose.bodyRoll*Math.PI/180;
  const bodyPoint=(point:Point):Point=>add(rotate(point,HIP,roll),[pose.laugh*2,bodyY]);
  const still=1-Math.min(1,pose.laugh+pose.original+pose.salute);
  const sway=Math.sin(time*.83)*1.4*still;
  const jumpSwing=pose.airborne*(1-pose.salute);
  const arms=ARMS.map((arm,side)=>{
    const elbow=add(blendPoint(arm.elbow,side===0?[280,270]:[460,260],side===0?[300,254]:[480,160],side===0?[273,267]:[485,198],pose),[(side===0?3:2)*jumpSwing+(side===0?-7:7)*pose.anticipation,-18*jumpSwing+pose.anticipation*3]);
    const wrist=add(blendPoint(arm.wrist,side===0?[339,284]:[398,281],side===0?[383,221]:[528,143],side===0?[338,278]:[538,185],pose),[(side===0?28:-20)*jumpSwing+(side===0?-6:6)*pose.anticipation,-46*jumpSwing+pose.anticipation*5]);
    return{shoulder:bodyPoint(arm.shoulder),elbow:bodyPoint(elbow),wrist:bodyPoint([wrist[0]+sway*(side===0?1:-1),wrist[1]+Math.abs(sway)*.25])};
  });
  const legs=HIPS.map((hip,side)=>{
    const outward=side===0?-1:1;
    return{hip:bodyPoint(hip),knee:add(KNEES[side],[outward*pose.knees*20,pose.knees*4+pose.anticipation*4+pose.landing*6+pose.jumpY-pose.airborne*5]),ankle:add(ANKLES[side],[outward*pose.knees*24,pose.jumpY-pose.airborne*8])};
  });
  const headTilt=(pose.headTilt+Math.sin(time*.71)*.35*still)*Math.PI/180;
  return{arms,legs,bodyPoint,headPoint:(point:Point)=>bodyPoint(rotate(point,NECK,headTilt)),bodyY};
}

export function createJudefanPainter(atlas:HTMLImageElement,target:HTMLCanvasElement){
  target.width=JUDEFAN_CANVAS.width;target.height=JUDEFAN_CANVAS.height;
  const ctx=target.getContext('2d')!;ctx.imageSmoothingQuality='high';
  const cel=(points:readonly Point[],cell=0):Cel=>{
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys));
    const image=document.createElement('canvas');image.width=Math.ceil(Math.max(...xs))-x+1;image.height=Math.ceil(Math.max(...ys))-y+1;
    const c=image.getContext('2d')!;c.translate(-x,-y);c.clip(polygon(points));c.drawImage(atlas,-ORIGINS[cell][0],-ORIGINS[cell][1]);
    return{image,x,y};
  };
  const torso=cel(TORSO),head=cel(HEAD),upper=UPPER.map(p=>cel(p)),lower=LOWER.map(p=>cel(p));
  const thigh=THIGHS.map(p=>cel(p)),shin=SHINS.map(p=>cel(p)),shoes=SHOES.map(p=>cel(p));
  const hands=[HAND_NEUTRAL.map(p=>cel(p)),HAND_LAUGH.map(p=>cel(p,1)),HAND_ORIGINAL.map(p=>cel(p,2)),HAND_SALUTE.map(p=>cel(p,3))];
  const headPaint=document.createElement('canvas');headPaint.width=head.image.width;headPaint.height=head.image.height;
  const hc=headPaint.getContext('2d')!;
  const draw=(part:Cel,sourceA:Point,sourceB:Point,destA:Point,destB:Point,opacity=1,stretch=true)=>{
    if(opacity<=.001)return;
    const sa=angle(sourceA,sourceB),da=angle(destA,destB),k=stretch?Math.hypot(destB[0]-destA[0],destB[1]-destA[1])/Math.hypot(sourceB[0]-sourceA[0],sourceB[1]-sourceA[1]):1;
    const cs=Math.cos(sa),ss=Math.sin(sa),cd=Math.cos(da),sd=Math.sin(da);
    const a=cd*k*cs+sd*ss,c=cd*k*ss-sd*cs,b=sd*k*cs-cd*ss,d=sd*k*ss+cd*cs;
    ctx.save();ctx.globalAlpha=opacity;ctx.setTransform(a,b,c,d,destA[0]-a*sourceA[0]-c*sourceA[1],destA[1]+TOP_PAD-b*sourceA[0]-d*sourceA[1]);ctx.drawImage(part.image,part.x,part.y);ctx.restore();
  };
  const drawHeadPatch=(source:Quad,destination:Quad,alpha:number)=>{
    if(alpha<=.001)return;
    const src=source.map(p=>add(p,ORIGINS[1])),dst=destination.map(([x,y])=>[x-head.x,y-head.y] as Point);
    hc.save();hc.globalAlpha=alpha;hc.clip(polygon(dst));
    for(const indexes of [[0,1,2],[0,2,3]])paintImageTriangle(hc,atlas,indexes.map(i=>src[i]),indexes.map(i=>dst[i]),2);
    hc.restore();
  };
  const paintHead=(pose:JudefanPose)=>{
    hc.clearRect(0,0,headPaint.width,headPaint.height);hc.drawImage(head.image,0,0);
    hc.save();hc.clip(polygon(HEAD.map(([x,y])=>[x-head.x,y-head.y] as Point)));
    // Only lens interiors/mouth change. The original hair, jaw, eyebrows and
    // glasses frames remain one stable painted head throughout the laugh.
    drawHeadPatch([[246,110],[269,105],[272,129],[248,134]],[[346,101],[371,100],[371,119],[347,120]],pose.eyesClosed);
    drawHeadPatch([[302,102],[324,98],[327,121],[305,126]],[[399,98],[425,97],[425,116],[400,117]],pose.eyesClosed);
    drawHeadPatch([[269,133],[306,129],[311,155],[274,162]],[[369,127],[403,126],[404,153],[370,154]],pose.mouthOpen);
    hc.restore();
  };
  const handWrist:readonly(readonly Point[])[]=[[[276,336],[466,331]],[[301,277],[362,274]],[[399,211],[536,135]],[[247,270],[508,187]]];
  const handAxis:readonly(readonly Point[])[]=[[[283,258],[455,255]],[[260,267],[389,247]],[[300,226],[480,158]],[[199,264],[449,194]]];
  const handPolygons=[HAND_NEUTRAL,HAND_LAUGH,HAND_ORIGINAL,HAND_SALUTE];
  const handFrames=handPolygons.map((pair,index)=>pair.map((points,side)=>{
    const center=centroid(points),axis=angle(handAxis[index][side],handWrist[index][side]);
    return{center,axis,contour:radialContour(points,center,axis),wrist:handWrist[index][side],cel:hands[index][side]};
  }));
  // One bounded scratch set is reused for both palms; no canvas allocation in
  // the animation loop. The largest registered palm is under 110px across.
  const handLayers=Array.from({length:3},()=>{const image=document.createElement('canvas');image.width=192;image.height=192;return image});
  const handContexts=handLayers.map(image=>image.getContext('2d')!);
  const directHand=(side:number,index:number,entry:Point,targetAngle:number)=>{
    const frame=handFrames[index][side],forward=add(frame.wrist,[Math.cos(frame.axis),Math.sin(frame.axis)]);
    draw(frame.cel,frame.wrist,forward,entry,add(entry,[Math.cos(targetAngle),Math.sin(targetAngle)]),1,false);
  };
  const morphHand=(side:number,index:number,weight:number,entry:Point,targetAngle:number)=>{
    if(weight<=.01){directHand(side,0,entry,targetAngle);return}
    if(weight>=.99){directHand(side,index,entry,targetAngle);return}
    const sources=[handFrames[0][side],handFrames[index][side]];
    const centers=sources.map(frame=>add(rotate(frame.center,frame.wrist,targetAngle-frame.axis),[entry[0]-frame.wrist[0],entry[1]-frame.wrist[1]]));
    const center=mix(centers[0],centers[1],weight);
    // Each radial ray has the same angular registration in the forearm plane.
    // Both textures therefore land on exactly ONE interpolated palm outline.
    const dest=sources[0].contour.map((p,i):Point=>{
      const radiusA=Math.hypot(p[0]-sources[0].center[0],p[1]-sources[0].center[1]);
      const q=sources[1].contour[i],radiusB=Math.hypot(q[0]-sources[1].center[0],q[1]-sources[1].center[1]);
      const radius=radiusA+(radiusB-radiusA)*weight,radians=targetAngle+i*Math.PI/8;
      return[center[0]+Math.cos(radians)*radius,center[1]+Math.sin(radians)*radius];
    });
    const left=Math.floor(Math.min(...dest.map(p=>p[0])))-3,top=Math.floor(Math.min(...dest.map(p=>p[1])))-3;
    const local=(p:Point):Point=>[p[0]-left,p[1]-top],localCenter=local(center),localDest=dest.map(local);
    sources.forEach((source,index)=>{
      const paint=handContexts[index];paint.clearRect(0,0,192,192);paint.save();paint.clip(polygon(localDest));
      const crop=(p:Point):Point=>[p[0]-source.cel.x,p[1]-source.cel.y];
      for(let i=0;i<16;i++){
        const next=(i+1)%16;
        paintImageTriangle(paint,source.cel.image,[crop(source.center),crop(source.contour[i]),crop(source.contour[next])],[localCenter,localDest[i],localDest[next]],3.2);
      }
      paint.restore();
    });
    const blend=handContexts[2];blend.clearRect(0,0,192,192);blend.save();
    // Add whole pre-rendered layers, not individual triangles. Matching alpha
    // coverage sums to one instead of exposing the background through a ghost
    // of a fist and an open hand at the midpoint of a pose transition.
    blend.globalAlpha=1-weight;blend.drawImage(handLayers[0],0,0);
    blend.globalCompositeOperation='lighter';blend.globalAlpha=weight;blend.drawImage(handLayers[1],0,0);blend.restore();
    ctx.drawImage(handLayers[2],left,top+TOP_PAD);
  };
  let lastKey='';
  return(pose:JudefanPose,time:number)=>{
    const key=[pose.original,pose.salute,pose.laugh,pose.chuckle,pose.breath,pose.bodyY,pose.bodyRoll,pose.headTilt,pose.eyesClosed,pose.mouthOpen,pose.knees,pose.jumpY,pose.airborne,pose.landing,pose.anticipation,time].map(n=>n.toFixed(4)).join(',');
    if(key===lastKey)return;lastKey=key;
    const rig=judefanRig(pose,time);ctx.clearRect(0,0,target.width,target.height);
    ctx.save();ctx.fillStyle='#150e19';ctx.globalAlpha=.16*(1-pose.airborne*.45)+pose.landing*.025;ctx.beginPath();ctx.ellipse(370,568+TOP_PAD,(123+pose.knees*20)*(1-pose.airborne*.24)+pose.landing*6,7+pose.landing*1.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
    for(let side=0;side<2;side++){
      const leg=rig.legs[side];
      draw(thigh[side],HIPS[side],KNEES[side],leg.hip,leg.knee);
      draw(shin[side],KNEES[side],ANKLES[side],leg.knee,leg.ankle);
      draw(shoes[side],ANKLES[side],add(ANKLES[side],[1,0]),leg.ankle,add(leg.ankle,[1,0]),1,false);
    }
    const upperArm=(side:number)=>{const source=ARMS[side],dest=rig.arms[side];draw(upper[side],source.shoulder,source.elbow,dest.shoulder,dest.elbow)};
    const forearm=(side:number)=>{const source=ARMS[side],dest=rig.arms[side];draw(lower[side],source.elbow,source.wrist,dest.elbow,dest.wrist)};
    upperArm(1);
    draw(torso,HIP,add(HIP,[1,0]),rig.bodyPoint(HIP),rig.bodyPoint(add(HIP,[1,0])),1,false);
    // The far shoulder sits behind the jacket, but its forearm folds across
    // the belly/chest in front. Hiding the entire arm behind the torso breaks
    // the sleeve connection during laughing and the original pointing pose.
    forearm(1);upperArm(0);forearm(0);
    const weights=[0,pose.laugh,pose.original,pose.salute];
    let activeHand=1;for(let index=2;index<4;index++)if(weights[index]>weights[activeHand])activeHand=index;
    for(let side=1;side>=0;side--){
      const targetArm=rig.arms[side],targetAngle=angle(targetArm.elbow,targetArm.wrist),entry=add(targetArm.wrist,[Math.cos(targetAngle)*8,Math.sin(targetAngle)*8]);
      morphHand(side,activeHand,weights[activeHand],entry,targetAngle);
    }
    paintHead(pose);
    draw({image:headPaint,x:head.x,y:head.y},NECK,add(NECK,[1,0]),rig.headPoint(NECK),rig.headPoint(add(NECK,[1,0])),1,false);
  };
}
