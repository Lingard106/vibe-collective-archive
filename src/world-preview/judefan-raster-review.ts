import atlasUrl from './assets/judefan-poses-v1.webp';
import {createJudefanPainter,judefanRig,JUDEFAN_CANVAS} from './judefan-painter';
import {judefanPose,JUDEFAN_ACTION_DURATIONS,type JudefanAction} from './judefan-motion';
import type {Point} from './portrait-head';

const report=document.querySelector<HTMLPreElement>('#report')!,frames=document.querySelector<HTMLElement>('#frames')!;
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
async function main(){
  if(!import.meta.env.DEV){report.textContent='此验收页仅本地开发可用。';report.dataset.status='disabled';return}
  const atlas=new Image();atlas.src=atlasUrl;await atlas.decode();
  const target=document.createElement('canvas'),paint=createJudefanPainter(atlas,target),ctx=target.getContext('2d',{willReadFrequently:true})!;
  let samples=0,failures=0,minAlpha=255,checked=0;
  const details:string[]=[];
  for(const action of ['laugh','original','salute'] as JudefanAction[])for(let frame=0;frame<=60;frame++){
    const age=JUDEFAN_ACTION_DURATIONS[action]*frame/60,pose=judefanPose(action,age,0),rig=judefanRig(pose,0);paint(pose,0);checked++;
    const pixels=ctx.getImageData(0,0,target.width,target.height).data;
    const check=(point:Point,label:string)=>{
      const x=Math.floor(point[0]),y=Math.floor(point[1]-JUDEFAN_CANVAS.top),alpha=x<0||y<0||x>=target.width||y>=target.height?0:pixels[(y*target.width+x)*4+3];
      samples++;minAlpha=Math.min(minAlpha,alpha);
      if(alpha<250){failures++;if(details.length<30)details.push(`${action} ${age.toFixed(3)}s ${label} (${x},${y}) alpha=${alpha}`)}
    };
    rig.arms.forEach((arm,side)=>{
      for(const [label,a,b]of [['upper',arm.shoulder,arm.elbow],['lower',arm.elbow,arm.wrist]] as const){
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
        for(let n=1;n<10;n++)for(const offset of [-2,0,2]){const p=mix(a,b,n/10);check([p[0]+nx*offset,p[1]+ny*offset],`arm${side}:${label}`)}
      }
      check(arm.elbow,`arm${side}:elbow`);check(arm.wrist,`arm${side}:wrist`);
    });
    rig.legs.forEach((leg,side)=>{for(const [a,b]of [[leg.hip,leg.knee],[leg.knee,leg.ankle]])for(let n=2;n<9;n++)check(mix(a,b,n/10),`leg${side}`)});
    for(const p of [[350,220],[375,280],[405,300]] as Point[])check(rig.bodyPoint(p),'torso');
    if(frame%15===0){report.textContent=`已检查 ${checked}/183 帧，${samples} 个内部像素点…`;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))}
  }
  for(const action of ['laugh','original','salute'] as JudefanAction[])for(const age of [.7,1.5,2.8]){
    paint(judefanPose(action,age,0),0);
    const figure=document.createElement('figure'),image=document.createElement('canvas'),caption=document.createElement('figcaption');
    image.width=target.width;image.height=target.height;image.getContext('2d')!.drawImage(target,0,0);caption.textContent=`${action} · ${age.toFixed(2)} 秒`;
    figure.append(image,caption);frames.append(figure);
  }
  report.dataset.status=failures?'fail':'pass';report.dataset.frames=String(checked);report.dataset.samples=String(samples);report.dataset.failures=String(failures);report.dataset.minimumAlpha=String(minAlpha);
  report.textContent=`${failures?'FAIL':'PASS'} — ${checked} 帧 / ${samples} 个内部采样点\n最低 alpha=${minAlpha}（要求≥250），缺口样本 ${failures}\n${details.join('\n')}\n仍需另行目视检查手掌、纹理与完整背景中的遮挡层级。`;
}
void main().catch(error=>{report.dataset.status='error';report.textContent=error instanceof Error?error.stack??error.message:String(error)});
