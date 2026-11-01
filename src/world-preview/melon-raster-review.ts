import {MELON_ARM_CANVAS,armCoverage,createMelonArmsPainter} from './melon-arms';
import {MELON_EAT_DURATION,melonEatingPose} from './melon-motion';
import type {Point} from './portrait-head';

const report=document.querySelector<HTMLPreElement>('#report')!;
const button=document.querySelector<HTMLButtonElement>('#run')!;
const frames=document.querySelector<HTMLElement>('#frames')!;
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const mean=(points:Point[]):Point=>[points.reduce((n,p)=>n+p[0],0)/points.length,points.reduce((n,p)=>n+p[1],0)/points.length];

async function main(){
  if(!import.meta.env.DEV){report.textContent='此验收页面仅在开发环境运行。';report.dataset.status='disabled';button.disabled=true;return}
  const image=new Image();image.src='/media/member-03-melon-profile.webp';await image.decode();
  const target=document.createElement('canvas');
  const paint=createMelonArmsPainter(image,target),context=target.getContext('2d',{willReadFrequently:true})!;
  const run=async()=>{
    button.disabled=true;report.dataset.status='running';frames.replaceChildren();
    let samples=0,failures=0,minimumAlpha=255;
    const affected=new Set<string>(),details:string[]=[];
    for(let frame=0;frame<=320;frame++){
      const age=MELON_EAT_DURATION*frame/320,pose=melonEatingPose(age);paint(pose.forearmX,pose.forearmY);
      const pixels=context.getImageData(0,0,target.width,target.height).data;
      const check=(point:Point,label:string)=>{
        const x=Math.round(point[0]-MELON_ARM_CANVAS.x),y=Math.round(point[1]-MELON_ARM_CANVAS.y);
        const alpha=x>=0&&y>=0&&x<target.width&&y<target.height?pixels[(y*target.width+x)*4+3]:0;
        samples++;minimumAlpha=Math.min(minimumAlpha,alpha);
        if(alpha<250){failures++;affected.add(age.toFixed(3));if(details.length<12)details.push(`${age.toFixed(3)}s ${label} (${point.map(n=>n.toFixed(1)).join(', ')}) alpha=${alpha}`)}
      };
      for(const shape of armCoverage(pose.forearmX,pose.forearmY)){
        for(const [name,a,b,width] of [['upper',shape.root,shape.elbow,shape.upperWidth],['lower',shape.elbow,shape.wrist,shape.lowerWidth]] as const){
          const length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/length,ny=(b[0]-a[0])/length;
          for(let n=0;n<=24;n++)for(const offset of [-.25,0,.25]){
            const p=mix(a,b,.08+.92*n/24);check([p[0]+nx*width*offset,p[1]+ny*width*offset],`arm${shape.arm}:${name}`);
          }
        }
        const center=mean(shape.hand);check(center,`arm${shape.arm}:palm`);check(mix(center,shape.hand[0],.25),`arm${shape.arm}:palm-edge`);
      }
      if(frame%32===0){report.textContent=`已检查 ${frame+1}/321 帧，${samples.toLocaleString()} 个内部像素点…`;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))}
    }
    for(const age of [.6,1,1.4,2,3.65,6.4]){
      const pose=melonEatingPose(age);paint(pose.forearmX,pose.forearmY);
      const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
      canvas.width=target.width;canvas.height=target.height;canvas.dataset.age=String(age);canvas.getContext('2d')!.drawImage(target,0,0);
      caption.textContent=`${age.toFixed(2)} 秒 · ${pose.phase} · ${target.width}×${target.height} 原分辨率`;
      figure.append(canvas,caption);frames.append(figure);
    }
    report.dataset.status=failures?'fail':'pass';report.dataset.frames='321';report.dataset.samples=String(samples);report.dataset.failures=String(failures);report.dataset.minimumAlpha=String(minimumAlpha);report.dataset.affectedAges=[...affected].join(',');
    report.textContent=`${failures?'FAIL':'PASS'} — 321 帧 / ${samples.toLocaleString()} 个内部像素点\n最低 alpha：${minimumAlpha}，要求 ≥250；透明缺口样本：${failures}\n${failures?`受影响时刻：${[...affected].slice(0,20).join(', ')}\n${details.join('\n')}`:'肩肘腕连续覆盖，手掌内部无透明缺口。'}\n关键帧仅显示手臂图层，非最终合成场景。`;
    button.disabled=false;
  };
  button.addEventListener('click',()=>{void run().catch(fail)});await run();
}
function fail(error:unknown){report.dataset.status='error';report.textContent=error instanceof Error?error.stack??error.message:String(error);button.disabled=false}
void main().catch(fail);
