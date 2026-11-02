import cleanGripUrl from './assets/melon-clean-grip-v2.webp';
import raisedGripUrl from './assets/melon-raised-grip-v2.webp';
import {MELON_ARM_CANVAS,armCoverage,armMeshes,createMelonArmsPainter} from './melon-arms';
import {MELON_EAT_DURATION,melonEatingPose} from './melon-motion';
import type {Point} from './portrait-head';

const report=document.querySelector<HTMLPreElement>('#report')!;
const button=document.querySelector<HTMLButtonElement>('#run')!;
const frames=document.querySelector<HTMLElement>('#frames')!;
function edgeDistance(p:Point,a:Point,b:Point){
  const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;
  const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;
  return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
}
function inside([x,y]:Point,polygon:readonly Point[]){
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,ay]=polygon[i],[bx,by]=polygon[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)result=!result;
  }
  return result;
}

async function main(){
  if(!import.meta.env.DEV){report.textContent='此验收页面仅在开发环境运行。';report.dataset.status='disabled';button.disabled=true;return}
  const load=async(src:string)=>{const image=new Image();image.src=src;await image.decode();return image};
  const [clean,raised]=await Promise.all([load(cleanGripUrl),load(raisedGripUrl)]);
  const back=document.createElement('canvas'),front=document.createElement('canvas'),target=document.createElement('canvas');
  target.width=MELON_ARM_CANVAS.width;target.height=MELON_ARM_CANVAS.height;
  const paint=createMelonArmsPainter(clean,raised,back,front),context=target.getContext('2d',{willReadFrequently:true})!;
  const render=(dx:number,dy:number)=>{paint(dx,dy);context.clearRect(0,0,target.width,target.height);context.drawImage(back,0,0);context.drawImage(front,0,0)};
  const run=async()=>{
    button.disabled=true;report.dataset.status='running';frames.replaceChildren();
    let samples=0,failures=0,minimumAlpha=255,checkedFrames=0,edgeSamplesSkipped=0;
    const affected=new Set<string>(),details:string[]=[];
    for(const [label,strength] of [['normal',1],['birthday',.28]] as const)for(let frame=0;frame<=320;frame++){
      const age=MELON_EAT_DURATION*frame/320,pose=melonEatingPose(age),dx=pose.forearmX*strength,dy=pose.forearmY*strength;render(dx,dy);checkedFrames++;
      const pixels=context.getImageData(0,0,target.width,target.height).data;
      const check=(point:Point,part:string,polygon?:readonly Point[])=>{
        const x=Math.round(point[0]-MELON_ARM_CANVAS.x),y=Math.round(point[1]-MELON_ARM_CANVAS.y);
        const pixel:Point=[x+MELON_ARM_CANVAS.x+.5,y+MELON_ARM_CANVAS.y+.5];
        // Ignore only the silhouette's antialias fringe, not internal gaps.
        if(polygon&&(!inside(pixel,polygon)||polygon.some((a,i)=>edgeDistance(pixel,a,polygon[(i+1)%polygon.length])<1.5))){edgeSamplesSkipped++;return}
        const alpha=x>=0&&y>=0&&x<target.width&&y<target.height?pixels[(y*target.width+x)*4+3]:0;
        samples++;minimumAlpha=Math.min(minimumAlpha,alpha);
        if(alpha<250){failures++;affected.add(label+':'+age.toFixed(3));if(details.length<12)details.push(label+' '+age.toFixed(3)+'s '+part+' ('+pixel.map(n=>n.toFixed(1)).join(', ')+') alpha='+alpha)}
      };
      for(const {arm,polygons} of armCoverage(dx,dy))for(let part=0;part<polygons.length;part++){
        const polygon=polygons[part],xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
        const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
        // Uniform interior samples work for both convex arm planes and the
        // concave thumb/finger silhouette, rather than assuming a rectangle.
        for(let v=1;v<10;v++)for(let u=1;u<10;u++)check([left+(right-left)*u/10,top+(bottom-top)*v/10],'arm'+arm+':part'+part,polygon);
      }
      // Overlap at anatomical joins must remain covered in the final composite.
      for(const {arm,elbow,wrist} of armMeshes(dx,dy)){check(elbow,'arm'+arm+':elbow');check(wrist,'arm'+arm+':wrist')}
      if(frame%32===0){report.textContent='已检查 '+checkedFrames+'/642 帧（普通/生日），'+samples.toLocaleString()+' 个内部像素点…';await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))}
    }
    for(const [label,strength] of [['普通',1],['生日',.28]] as const)for(const age of [.6,1,1.4,2,3.65,6.4]){
      const pose=melonEatingPose(age);render(pose.forearmX*strength,pose.forearmY*strength);
      const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
      canvas.width=target.width;canvas.height=target.height;canvas.dataset.age=String(age);canvas.dataset.mode=label;canvas.getContext('2d')!.drawImage(target,0,0);
      caption.textContent=label+' · '+age.toFixed(2)+' 秒 · '+pose.phase+' · '+target.width+'×'+target.height+' 原分辨率';
      figure.append(canvas,caption);frames.append(figure);
    }
    report.dataset.status=failures?'fail':'pass';report.dataset.frames=String(checkedFrames);report.dataset.samples=String(samples);report.dataset.failures=String(failures);report.dataset.minimumAlpha=String(minimumAlpha);report.dataset.edgeSamplesSkipped=String(edgeSamplesSkipped);report.dataset.affectedAges=[...affected].join(',');
    report.textContent=(failures?'FAIL':'PASS')+' — '+checkedFrames+' 帧 / '+samples.toLocaleString()+' 个内部像素点\n最低 alpha：'+minimumAlpha+'，要求 ≥250；透明缺口样本：'+failures+'\n'+(failures?'受影响时刻：'+[...affected].slice(0,20).join(', ')+'\n'+details.join('\n'):'普通与生日抬手的手臂表面、手掌和肘腕连接点均未发现内部透明缺口。')+'\n排除轮廓外及边缘抗锯齿样本：'+edgeSamplesSkipped+'。\n关键帧仅为前后手臂层合成；最终遮挡关系、纹理与动作自然度仍须在完整场景目视验收。';
    button.disabled=false;
  };
  button.addEventListener('click',()=>{void run().catch(fail)});await run();
}
function fail(error:unknown){report.dataset.status='error';report.textContent=error instanceof Error?error.stack??error.message:String(error);button.disabled=false}
void main().catch(fail);
