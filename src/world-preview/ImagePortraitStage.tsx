import {useEffect,useId,useRef,useState} from 'react';
import masterUrl from './assets/lingard-portrait-master-v1.webp';
import celebrationUrl from './assets/lingard-celebration-v1.png';
import headAtlasUrl from './assets/lingard-head-atlas-v1.webp';
import cleanPlateUrl from './assets/lingard-environment-v1.webp';
import {portraitPose,GREETING_MOVE,type PortraitAction} from './portrait-motion';
import {createPortraitActionQueue} from './portrait-actions';
import {createHeadPainter} from './portrait-head';
import {createLowerBodyPainter} from './portrait-body';
import {createUpperBodyPainter} from './portrait-upper';
import SiuMark from './SiuMark';
import './image-portrait.css';

type Surface='background'|'cover'|'study';
const HEAD='M492 416L495 411 503 409 501 403 507 400 511 397 519 395 521 389 530 386 541 385 544 380 554 383 568 382 570 385 584 386 586 389 598 390 600 394 607 396 607 402 612 404 615 414 617 423 617 437 611 437 613 457 613 485 558 490 544 487 520 489 512 484 509 478 503 479 500 471 497 467 498 458 494 451 495 443 491 435Z';
const BODY='M488 491L608 487 625 532 622 624 641 716 654 757 673 775 677 798 654 815 608 817 583 802 580 778 567 703 558 661 545 706 531 769 551 785 554 807 518 829 479 824 463 811 464 790 472 764 486 696 505 625 493 579 484 535Z';
const LEFT_ARM='M522 489L479 477 432 463 428 451 418 438 409 439 405 447 399 443 393 445 394 450 387 448 385 451 386 458 381 459 382 466 379 470 382 477 378 481 385 490 423 505 473 521 512 535 526 526Z';
const RIGHT_ARM='M604 495L646 477 680 465 681 458 687 454 693 449Q696 447 698 451L699 455 708 454 715 459 721 468 725 479 723 490 695 500 659 515 620 534 604 527Z';

export default function ImagePortraitStage({src,surface='study',review}:{src:string;surface?:Surface;review?:{action:PortraitAction;age?:number;gaze?:number;zoom?:number}}){
  const id=useId().replace(/:/g,'');
  const host=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),scene=useRef<SVGGElement>(null);
  const upper=useRef<SVGGElement>(null),head=useRef<SVGGElement>(null),headCanvas=useRef<HTMLCanvasElement>(null);
  const lowerCanvas=useRef<HTMLCanvasElement>(null),actor=useRef<SVGGElement>(null);
  const shadow=useRef<SVGEllipseElement>(null);
  const upperCanvas=useRef<HTMLCanvasElement>(null);
  const armHit=useRef<SVGPathElement>(null),person=useRef<SVGGElement>(null);
  const siuLabel=useRef<HTMLDivElement>(null),siuImpact=useRef<SVGGElement>(null);
  const trigger=useRef<()=>void>(()=>{});
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);

  useEffect(()=>{
    const el=host.current!;let disposed=false,loaded=false,loading=false,visible=true,frame=0,last=0,time=0;
    let width=1,height=1,lookX=0,lookY=0,targetX=0,targetY=0;
    const actions=createPortraitActionQueue();let feedback:Animation|undefined;
    const camera={x:0,y:0,scale:1};
    const media=matchMedia('(prefers-reduced-motion:reduce)'),small=matchMedia('(max-width:650px)');
    let paint:ReturnType<typeof createHeadPainter>|undefined;
    let paintLower:ReturnType<typeof createLowerBodyPainter>|undefined;
    let paintUpper:ReturnType<typeof createUpperBodyPainter>|undefined;
    const pendingImages:HTMLImageElement[]=[];
    const running=()=>!disposed&&loaded&&visible&&!document.hidden&&!media.matches&&review?.age===undefined;
    const draw=()=>{
      const state=actions.sample(time);
      const pose=portraitPose(review?.age??time,review?.gaze??lookX,lookY,review?.age??state.age,media.matches,review?.action??state.action);
      scene.current?.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
      upper.current?.setAttribute('transform',`translate(${pose.hipX} ${pose.breath+pose.crouch}) rotate(${pose.bodyRoll} 555 840)`);
      actor.current?.setAttribute('transform',`translate(${pose.approach*GREETING_MOVE.x} ${pose.approach*GREETING_MOVE.y+pose.rootY}) translate(555 1490) rotate(${pose.rootRoll}) scale(${1+pose.approach*GREETING_MOVE.scale}) translate(-555 -1490)`);
      shadow.current?.setAttribute('cx',String(548+pose.approach*GREETING_MOVE.x*.302));
      shadow.current?.setAttribute('cy',String(817+pose.approach*GREETING_MOVE.y*.302));
      shadow.current?.setAttribute('rx',String(86*(1-Math.min(1,Math.abs(pose.rootY)/118)*.28)+pose.legSpread*.13));
      shadow.current?.setAttribute('opacity',String(.2-Math.min(1,Math.abs(pose.rootY)/118)*.08));
      const arms=paintUpper?.(pose);if(arms)armHit.current?.setAttribute('d',arms);
      const headTurn=pose.yaw-.3;
      head.current?.setAttribute('transform',`translate(${headTurn*9} ${pose.nod}) rotate(${pose.tilt} 555 466) translate(555 466) skewY(${headTurn*1.8}) scale(${1-Math.abs(headTurn)*.025} 1) translate(-555 -466)`);
      paintLower?.(pose.hipX,pose.breath+pose.crouch,pose.bodyRoll,pose);
      paint?.(pose.yaw,pose.blink,pose.smile);
      if(siuLabel.current){
        const label=siuLabel.current;
        label.style.opacity=String(pose.siuLabel);
        label.style.left=`${Math.max(50,Math.min(width-50,camera.x+(382+.302*(840+pose.approach*32))*camera.scale))}px`;
        label.style.top=`${Math.max(35,camera.y+(371.5+.302*(220+pose.rootY))*camera.scale)}px`;
        label.style.transform=`translate(-50%,-100%) rotate(-8deg) scale(${.82+pose.siuLabel*.18+pose.siuImpact*.12})`;
      }
      siuImpact.current?.setAttribute('opacity',String(pose.siuImpact*.7));
      siuImpact.current?.setAttribute('transform',`translate(548 817) scale(${.7+pose.siuImpact*.55})`);
      el.dataset.yaw=pose.yaw.toFixed(3);el.dataset.blink=pose.blink.toFixed(2);
      el.dataset.pose=pose.phase;el.dataset.approach=pose.approach.toFixed(3);
      el.dataset.hip=pose.hipX.toFixed(2);
      el.dataset.pending=String(state.pending);el.dataset.accepted=String(state.accepted);el.dataset.started=String(state.started);
      el.dataset.action=state.action;el.dataset.age=state.age.toFixed(2);
      el.dataset.motion=running()?'playing':'paused';el.dataset.method='painted-articulated-portrait';
    };
    const loop=(now:number)=>{
      if(!running()){frame=0;return}
      frame=requestAnimationFrame(loop);
      if(last&&now-last<1000/30)return;
      el.dataset.frameMs=last?(now-last).toFixed(1):'0';
      const dt=last?Math.min(.1,(now-last)/1000):0;last=now;time+=dt;
      const smoothing=1-Math.exp(-4.5*dt);
      lookX+=(targetX-lookX)*smoothing;lookY+=(targetY-lookY)*smoothing;draw();
    };
    const wake=()=>{cancelAnimationFrame(frame);last=0;draw();if(running())frame=requestAnimationFrame(loop)};
    const resize=()=>{
      width=Math.max(1,el.clientWidth);height=Math.max(1,el.clientHeight);
      camera.scale=Math.max(width/1672,height/940);
      camera.x=(width-1672*camera.scale)*.5;
      camera.y=(height-940*camera.scale)*(surface==='cover'?.32:small.matches&&surface==='background'?.18:.5);
      if(review?.zoom){
        camera.scale*=review.zoom;
        camera.x=width*(surface==='cover'?.5:.27)-550*camera.scale;
        camera.y=height*.5-445*camera.scale;
      }
      svg.current?.setAttribute('viewBox',`0 0 ${width} ${height}`);wake();
    };
    const point=(event:PointerEvent)=>{
      if(!running()||event.pointerType==='touch')return;
      const rect=el.getBoundingClientRect(),scale=rect.width/width;
      const x=rect.left+(camera.x+550*camera.scale)*scale;
      const y=rect.top+(camera.y+445*camera.scale)*scale;
      targetX=Math.max(-1,Math.min(1,(event.clientX-x)/Math.max(190,width*.33)));
      targetY=Math.max(-1,Math.min(1,(event.clientY-y)/Math.max(170,height*.35)));
    };
    const leave=()=>{targetX=0;targetY=0};
    trigger.current=()=>{if(running()){
      const state=actions.enqueue(time,review?.action);el.dataset.lastAction=state.action;
      feedback?.cancel();feedback=person.current?.animate([{filter:'brightness(.88) saturate(.94)'},{filter:'brightness(.78) saturate(.94)'}],{duration:220,easing:'ease-out'});
      draw();
    }};
    const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();pendingImages.push(image);image.decoding='async';
      image.onload=()=>image.decode().then(()=>resolve(image),reject);
      image.onerror=()=>reject(new Error('Portrait asset failed'));image.src=url;
    });
    const ensureLoaded=()=>{
      if(loaded||loading||disposed)return;
      loading=true;setFailed(false);
      Promise.all([load(src),load(cleanPlateUrl),load(masterUrl),load(headAtlasUrl),load(celebrationUrl)]).then(images=>{
        if(disposed)return;
        paint=createHeadPainter(images[3],headCanvas.current!);
        paintLower=createLowerBodyPainter(images[2],lowerCanvas.current!);
        paintUpper=createUpperBodyPainter(images[2],images[4],upperCanvas.current!);
        loaded=true;draw();setReady(true);wake();
      }).catch(()=>{if(!disposed){loaded=false;setFailed(true);setReady(false);cancelAnimationFrame(frame)}}).finally(()=>{loading=false});
    };
    const observer=new ResizeObserver(resize);observer.observe(el);
    // The desktop backdrop and mobile cover coexist. Only allocate the visible
    // surface's high-resolution image rig; do not double the canvas workload.
    const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(visible)ensureLoaded();wake()});intersection.observe(el);
    window.addEventListener('pointermove',point,{passive:true});
    document.documentElement.addEventListener('pointerleave',leave);window.addEventListener('blur',leave);
    document.addEventListener('visibilitychange',wake);media.addEventListener('change',wake);small.addEventListener('change',resize);
    resize();
    return()=>{
      disposed=true;cancelAnimationFrame(frame);feedback?.cancel();trigger.current=()=>{};
      observer.disconnect();intersection.disconnect();
      window.removeEventListener('pointermove',point);document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('blur',leave);
      document.removeEventListener('visibilitychange',wake);media.removeEventListener('change',wake);small.removeEventListener('change',resize);
      pendingImages.forEach(image=>{image.onload=null;image.onerror=null});paint=undefined;paintLower=undefined;paintUpper=undefined;
    };
  },[src,surface,review]);

  const className=surface==='background'?'member-page-bg':surface==='cover'?'mobile-profile-cover':'ip-study';
  return <div ref={host} className={`ip-embedded ${className}`} data-ready={ready} data-failed={failed}>
    <svg ref={svg} className="ip-art" preserveAspectRatio="none" aria-label="林加德图像动画预览：自然站立、眨眼、随鼠标小幅转头">
      <defs>
        <filter id={id+'-edge'} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".7"/></filter>
        <mask id={id+'-erase'} maskUnits="userSpaceOnUse" x="370" y="370" width="365" height="470">
          <g filter={`url(#${id}-edge)`} fill="white" stroke="white" strokeWidth="5" strokeLinejoin="round">
            {[HEAD,BODY,LEFT_ARM,RIGHT_ARM].map((d,i)=><path key={i} d={d}/>)}
          </g>
        </mask>
      </defs>
      <g ref={scene}>
        <image href={src} width="1672" height="940"/>
        <g opacity={ready&&!failed?1:0}>
          <image href={cleanPlateUrl} width="1672" height="940" preserveAspectRatio="none" mask={`url(#${id}-erase)`}/>
          <ellipse ref={shadow} cx="548" cy="817" rx="86" ry="12" fill="#050911" opacity=".2"/>
          <g ref={siuImpact} opacity="0" aria-hidden="true" pointerEvents="none">
            <path d="M-90 0L-60 -12H60L90 0L60 12H-60Z" fill="none" stroke="#f0cf88" strokeWidth="2"/>
            <path d="M-102 -18h5v5h-5Z M92 -20h4v4h-4Z M-67 -29h4v4h-4Z M68 -31h5v5h-5Z" fill="#f5d896"/>
          </g>
          <g transform="translate(382 371.5) scale(.302)">
           <g ref={actor}>
            <g ref={person} className="ip-person">
            <foreignObject x="0" y="836" width="1024" height="700"><canvas ref={lowerCanvas} className="ip-body-canvas" aria-hidden="true"/></foreignObject>
            <g ref={upper}>
              <foreignObject x="-280" y="-220" width="1560" height="1220"><canvas ref={upperCanvas} className="ip-upper-canvas" aria-hidden="true"/></foreignObject>
              <g ref={head}><foreignObject x="313" y="57" width="484" height="429"><canvas ref={headCanvas} className="ip-head-canvas" aria-hidden="true"/></foreignObject></g>
              {ready&&!failed&&<path ref={armHit} className="ip-hit" fill="transparent" aria-hidden="true" onClick={()=>trigger.current()}/>}
            </g>
            </g>
            {ready&&!failed&&<path className="ip-hit" role="button" tabIndex={0} aria-label="与林加德互动" d="M280 40H750V400L820 935 774 1300 850 1480 550 1500 500 1510 200 1500 255 1275 195 930 250 420Z" fill="transparent" onClick={()=>trigger.current()} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();trigger.current()}}}>
              <title>点击人物或手臂随机回应、挥手或 Siu；连续点击会依次播放</title>
            </path>}
           </g>
          </g>
        </g>
      </g>
    </svg>
    <div ref={siuLabel} className="ip-siu-fx" aria-hidden="true"><SiuMark/></div>
  </div>;
}
