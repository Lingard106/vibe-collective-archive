import {useEffect,useId,useRef,useState} from 'react';
import lapPatchUrl from './assets/melon-lap-patch-v1.webp';
import cleanGripUrl from './assets/melon-clean-grip-v2.webp';
import raisedGripUrl from './assets/melon-raised-grip-v2.webp';
import birthdayCakeUrl from './assets/melon-birthday-cake-2026.webp';
import {useMelonBirthday} from '../birthday/useMelonBirthday';
import {MELON_EAT_DURATION,melonEatingPose} from './melon-motion';
import {MELON_ARM_PATHS,MELON_ARM_CANVAS,createMelonArmsPainter} from './melon-arms';
import {prepareImage} from '../media/image-loader';
import './image-portrait.css';

const FRUIT='M367 531L390 528 565 539 570 559 565 580 554 604 536 624 510 637 475 644 441 638 413 625 390 606 378 584 370 559Z';
const ease=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};

// Reuse the original seated artwork. Only the forearms and fruit are articulated;
// the 42 KB lossless patch fills the previously occluded torso/lap, not the scene.
export default function MelonEatingStage({src,surface,reviewFrame}:{src:string;surface:'background'|'cover';reviewFrame?:number}){
  const birthday=useMelonBirthday();
  const id=useId().replace(/:/g,'');
  const host=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),scene=useRef<SVGGElement>(null);
  const actionLayer=useRef<SVGGElement>(null),fruit=useRef<SVGGElement>(null),arms=useRef<HTMLCanvasElement>(null),grips=useRef<HTMLCanvasElement>(null);
  const biteOne=useRef<SVGPathElement>(null),biteTwo=useRef<SVGPathElement>(null),mouth=useRef<SVGPathElement>(null);
  const trigger=useRef<()=>void>(()=>{});
  const [ready,setReady]=useState(false);
  const [surfaceActive,setSurfaceActive]=useState(false);
  useEffect(()=>{
    const el=host.current!;
    let disposed=false,visible=false,loaded=false,loading=false,frame=0,last=0,time=0,start=-100,pending=0,accepted=0,started=0;
    let painter:ReturnType<typeof createMelonArmsPainter>|undefined;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)'),small=matchMedia('(max-width:650px)');
    const enabled=()=>surface==='cover'?small.matches:!small.matches;
    const running=()=>loaded&&visible&&enabled()&&!disposed&&!document.hidden&&!reduced.matches&&reviewFrame===undefined;
    const draw=()=>{
      const drawStarted=performance.now();
      while(time>=start+MELON_EAT_DURATION&&pending>0){start+=MELON_EAT_DURATION+.15;pending--;started++}
      const age=reviewFrame??time-start;
      const pose=melonEatingPose(age,reduced.matches);
      // A birthday cake is offered gently; do not push lit candles into his face.
      const handX=pose.forearmX*(birthday?.28:1),handY=pose.forearmY*(birthday?.28:1);
      // Keep the same cleaned grip at rest and in motion, rather than repainting
      // the hands with a dissolve on every click/reset.
      actionLayer.current?.setAttribute('opacity',String(loaded&&enabled()?1:0));
      fruit.current?.setAttribute('transform',`translate(${handX} ${handY})`);
      painter?.(handX,handY);
      const biteVisibility=age>=0&&age<=MELON_EAT_DURATION?1-ease((age-6.8)/.6):0;
      biteOne.current?.setAttribute('opacity',String(ease((age-2)/.12)*biteVisibility));
      biteTwo.current?.setAttribute('opacity',String(ease((age-3.5)/.12)*biteVisibility));
      mouth.current?.setAttribute('opacity',String(birthday?0:pose.mouthOpen*.7));
      mouth.current?.setAttribute('transform',`translate(0 ${pose.chew*.7})`);
      el.dataset.pose=pose.phase;el.dataset.age=age.toFixed(2);el.dataset.lift=pose.lift.toFixed(3);
      el.dataset.accepted=String(accepted);el.dataset.started=String(started);el.dataset.pending=String(pending);
      el.dataset.motion=running()?'playing':'paused';
      el.dataset.birthday=String(birthday);
      el.dataset.drawMs=(performance.now()-drawStarted).toFixed(2);
    };
    const loop=(now:number)=>{
      if(!running()){frame=0;return}
      frame=requestAnimationFrame(loop);
      el.dataset.frameMs=last?(now-last).toFixed(2):'0';
      const dt=last?Math.max(0,(now-last)/1000):0;last=now;time+=dt;draw();
    };
    const wake=()=>{cancelAnimationFrame(frame);last=0;draw();if(running())frame=requestAnimationFrame(loop)};
    const resize=()=>{
      setSurfaceActive(enabled());
      const width=Math.max(1,el.clientWidth),height=Math.max(1,el.clientHeight);
      const scale=Math.max(width/1672,height/940),x=(width-1672*scale)*.5;
      const y=(height-940*scale)*(surface==='cover'?.32:small.matches?.18:.5);
      svg.current?.setAttribute('viewBox',`0 0 ${width} ${height}`);
      scene.current?.setAttribute('transform',`translate(${x} ${y}) scale(${scale})`);if(visible&&enabled())load();wake();
    };
    trigger.current=()=>{
      if(!running())return;
      accepted++;
      if(time>=start+MELON_EAT_DURATION&&pending===0){start=time;started++}else pending++;
      draw();
    };
    const load=()=>{
      if(loaded||loading||disposed||!enabled())return;
      loading=true;
      Promise.all([prepareImage(src),prepareImage(lapPatchUrl),prepareImage(cleanGripUrl),prepareImage(raisedGripUrl),...(birthday?[prepareImage(birthdayCakeUrl)]:[])]).then(([, ,cleanGrip,raisedGrip])=>{
        if(disposed)return;
        painter=createMelonArmsPainter(cleanGrip,raisedGrip,arms.current!,grips.current!);loaded=true;delete el.dataset.failed;setReady(true);wake();
      }).catch(()=>{if(!disposed)el.dataset.failed='true'}).finally(()=>{loading=false});
    };
    const observer=new ResizeObserver(resize);observer.observe(el);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(visible)load();wake()});intersection.observe(el);
    document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);small.addEventListener('change',resize);
    resize();
    return()=>{disposed=true;cancelAnimationFrame(frame);trigger.current=()=>{};observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);small.removeEventListener('change',resize)};
  },[src,surface,reviewFrame,birthday]);
  return <div ref={host} className={`ip-embedded ${surface==='background'?'member-page-bg':'mobile-profile-cover'}`} data-ready={ready}>
    <svg ref={svg} className="ip-art" preserveAspectRatio="none" aria-label={birthday?'西瓜生日限定：手捧草莓生日蛋糕':'西瓜坐在石台上，点击人物吃西瓜'}>
      <defs>
        <mask id={id+'-erase'} maskUnits="userSpaceOnUse" x="270" y="522" width="325" height="132">{[FRUIT,...MELON_ARM_PATHS].map((d,i)=><path key={i} d={d} fill="white" stroke="white" strokeWidth="1.5"/>)}</mask>
        <mask id={id+'-fruit'} maskUnits="userSpaceOnUse" x="360" y="520" width="225" height="135">
          <path d={FRUIT} fill="white"/>
          <path ref={biteOne} opacity="0" d="M433 527H457V539H453V545H438V539H433Z" fill="black"/>
          <path ref={biteTwo} opacity="0" d="M459 528H482V540H478V546H464V541H459Z" fill="black"/>
        </mask>
      </defs>
      <g ref={scene}>
        <image href={src} width="1672" height="940"/>
        <g ref={actionLayer} opacity="0">
          <image href={lapPatchUrl} x="270" y="522" width="325" height="132" mask={`url(#${id}-erase)`}/>
          <path ref={mouth} opacity="0" d="M434 422L441 425 459 425 465 423 463 429 440 429Z" fill="#713b2a"/>
          <foreignObject x={MELON_ARM_CANVAS.x} y={MELON_ARM_CANVAS.y} width={MELON_ARM_CANVAS.width} height={MELON_ARM_CANVAS.height}><canvas ref={arms} className="ip-upper-canvas" aria-hidden="true"/></foreignObject>
          <g ref={fruit}>{birthday?<image href={birthdayCakeUrl} x="365" y="512" width="214" height="132" preserveAspectRatio="xMidYMax meet"/>:<image href={src} width="1672" height="940" mask={`url(#${id}-fruit)`}/>}</g>
          <foreignObject x={MELON_ARM_CANVAS.x} y={MELON_ARM_CANVAS.y} width={MELON_ARM_CANVAS.width} height={MELON_ARM_CANVAS.height}><canvas ref={grips} className="ip-upper-canvas" aria-hidden="true"/></foreignObject>
        </g>
        {ready&&surfaceActive&&<path className="ip-hit" role="button" tabIndex={0} aria-label={birthday?'点击西瓜举起生日蛋糕':'点击西瓜吃西瓜'} d="M330 291L470 283 517 326 520 453 552 522 589 645 625 763 675 804 673 852 541 865 507 817 430 757 425 888 320 895 315 810 330 647 284 606 280 540 300 467 327 443Z" fill="transparent" onClick={()=>trigger.current()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();trigger.current()}}}><title>{birthday?'点击人物，举起生日蛋糕向你致意':'点击西瓜，坐着吃两口西瓜；连续点击会依次播放'}</title></path>}
      </g>
    </svg>
  </div>;
}
