import {useEffect,useId,useRef,useState} from 'react';
import atlasUrl from './assets/judefan-poses-v1.webp';
import cleanPatchUrl from './assets/judefan-clean-patch-v1.webp';
import {prepareImage} from '../media/image-loader';
import {createJudefanController,judefanPose,type JudefanAction} from './judefan-motion';
import {createJudefanPainter,JUDEFAN_CANVAS} from './judefan-painter';
import './image-portrait.css';

export type JudefanReview={action:JudefanAction;age?:number};
const ACTOR={x:70,y:214,scale:1.225} as const;
// Only the original foreground person is replaced. The surrounding original
// image, campus lettering, books and props continue to come from the source.
const ORIGINAL_PERSON=[
  'M424 238H580V249H599V272H606V387L575 407H436V389L424 360Z',
  'M419 397H573L603 430 619 608 609 636H443L431 563 428 518 410 485 413 442Z',
  'M419 406L466 407 566 421 598 441 606 457 590 488 440 509 412 486Z',
  'M572 380L671 340 700 328 741 316 765 314 765 341 749 350 758 358 750 385 706 413 630 454 590 480 566 447Z',
  'M444 615H606L620 713 640 818 650 855 664 879 665 903 642 917H572L550 901 531 831 514 765 482 860 467 891 441 908 387 920 367 908 370 874 392 843 412 746Z',
].join(' ');

export default function JudefanPortraitStage({src,surface,review}:{src:string;surface:'background'|'cover';review?:JudefanReview}){
  const id=useId().replace(/:/g,'');
  const host=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),scene=useRef<SVGGElement>(null),canvas=useRef<HTMLCanvasElement>(null),shadow=useRef<SVGEllipseElement>(null);
  const trigger=useRef<()=>void>(()=>{}),hit=useRef<(x:number,y:number)=>boolean>(()=>false);
  const [ready,setReady]=useState(false),[active,setActive]=useState(false);
  useEffect(()=>{
    const el=host.current!;
    let disposed=false,visible=false,loaded=false,loading=false,raf=0,last=0,time=0;
    let paint:ReturnType<typeof createJudefanPainter>|undefined;
    const small=matchMedia('(max-width:650px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
    const camera={x:0,y:0,scale:1,width:1,height:1};
    const controller=createJudefanController();
    const enabled=()=>surface==='cover'?small.matches:!small.matches;
    const running=()=>loaded&&enabled()&&visible&&!disposed&&!document.hidden&&!reduced.matches&&review?.age===undefined;
    const draw=()=>{
      const started=performance.now(),state=controller.sample(time,reduced.matches);
      const age=review?.age??time;
      const pose=review?judefanPose(review.action,age,time,reduced.matches):state.pose;
      paint?.(pose,time);
      shadow.current?.setAttribute('rx',String(121*(1-pose.airborne*.24)+pose.landing*8));
      shadow.current?.setAttribute('opacity',String(.17*(1-pose.airborne*.55)+pose.landing*.025));
      el.dataset.ready=String(loaded);el.dataset.action=review?.action??state.action??'rest';el.dataset.mode=review?'review':state.mode;
      el.dataset.age=(review?age:state.age).toFixed(3);el.dataset.phase=pose.phase;
      el.dataset.laugh=pose.laugh.toFixed(3);el.dataset.original=pose.original.toFixed(3);el.dataset.salute=pose.salute.toFixed(3);
      el.dataset.jumpY=pose.jumpY.toFixed(3);el.dataset.landing=pose.landing.toFixed(3);
      el.dataset.accepted=String(state.accepted);el.dataset.started=String(state.started);el.dataset.pending=String(state.pending);el.dataset.idleStarted=String(state.idleStarted);
      el.dataset.motion=running()?'playing':'paused';el.dataset.drawMs=(performance.now()-started).toFixed(2);
    };
    const loop=(now:number)=>{
      if(!running()){raf=0;return}
      raf=requestAnimationFrame(loop);
      const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;
      el.dataset.frameMs=last?(now-last).toFixed(1):'0';last=now;time+=dt;draw();
    };
    const wake=()=>{cancelAnimationFrame(raf);last=0;draw();if(running())raf=requestAnimationFrame(loop)};
    const load=()=>{
      if(loaded||loading||disposed||!enabled())return;
      loading=true;
      Promise.all([prepareImage(src),prepareImage(atlasUrl),prepareImage(cleanPatchUrl)]).then(([,atlas])=>{
        if(disposed)return;
        paint=createJudefanPainter(atlas,canvas.current!);loaded=true;delete el.dataset.failed;setReady(true);wake();
      }).catch(()=>{if(!disposed)el.dataset.failed='true'}).finally(()=>{loading=false});
    };
    const resize=()=>{
      setActive(enabled());
      camera.width=Math.max(1,el.clientWidth);camera.height=Math.max(1,el.clientHeight);
      camera.scale=Math.max(camera.width/1672,camera.height/940);
      camera.x=(camera.width-1672*camera.scale)*.5;
      camera.y=(camera.height-940*camera.scale)*(surface==='cover'?.32:.5);
      svg.current?.setAttribute('viewBox',`0 0 ${camera.width} ${camera.height}`);
      scene.current?.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
      if(visible&&enabled())load();wake();
    };
    trigger.current=()=>{if(!running())return;controller.click(time);draw()};
    hit.current=(clientX,clientY)=>{
      if(!loaded)return false;
      const rect=el.getBoundingClientRect();
      const x=(((clientX-rect.left)*camera.width/rect.width-camera.x)/camera.scale-ACTOR.x)/ACTOR.scale;
      const y=(((clientY-rect.top)*camera.height/rect.height-camera.y)/camera.scale-ACTOR.y)/ACTOR.scale-JUDEFAN_CANVAS.top;
      if(x<0||y<0||x>=JUDEFAN_CANVAS.width||y>=JUDEFAN_CANVAS.height)return false;
      return canvas.current!.getContext('2d')!.getImageData(Math.floor(x),Math.floor(y),1,1).data[3]>40;
    };
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(visible)load();wake()});intersection.observe(el);
    document.addEventListener('visibilitychange',wake);small.addEventListener('change',resize);reduced.addEventListener('change',wake);
    resize();
    return()=>{
      disposed=true;cancelAnimationFrame(raf);trigger.current=()=>{};hit.current=()=>false;
      resizeObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',wake);small.removeEventListener('change',resize);reduced.removeEventListener('change',wake);
    };
  },[src,surface,review]);
  return <div ref={host} className={`ip-embedded ${surface==='background'?'member-page-bg':'mobile-profile-cover'}`} data-ready={ready}>
    <svg ref={svg} className="ip-art" preserveAspectRatio="none" aria-label="槽阻互动人物：偶尔捧腹大笑，点击随机指向远方或展开手掌">
      <defs>
        <filter id={id+'-soft'} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".7"/></filter>
        <mask id={id+'-erase'} maskUnits="userSpaceOnUse" x="350" y="225" width="440" height="705"><path d={ORIGINAL_PERSON} fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" filter={`url(#${id}-soft)`}/></mask>
      </defs>
      <g ref={scene}>
        <image href={src} width="1672" height="940"/>
        <g opacity={ready?1:0}>
          <image href={cleanPatchUrl} x="350" y="225" width="440" height="705" mask={`url(#${id}-erase)`}/>
          <ellipse ref={shadow} cx="515" cy="912" rx="121" ry="13" fill="#16101d" opacity=".17"/>
          <g transform={`translate(${ACTOR.x} ${ACTOR.y}) scale(${ACTOR.scale})`}>
            <foreignObject y={JUDEFAN_CANVAS.top} width={JUDEFAN_CANVAS.width} height={JUDEFAN_CANVAS.height}><canvas ref={canvas} className="ip-upper-canvas" aria-hidden="true"/></foreignObject>
            {ready&&active&&<path className="ip-hit" d="M0 -64H665V620H0Z" fill="transparent" role="button" tabIndex={0} aria-label="与槽阻互动" onClick={event=>{if(event.detail===0||hit.current(event.clientX,event.clientY))trigger.current()}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();trigger.current()}}}><title>点击人物，随机指向远方或跳起落地摆出张掌姿势；等待一会儿可能会看到捧腹大笑</title></path>}
          </g>
        </g>
      </g>
    </svg>
  </div>;
}
