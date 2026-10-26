import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowUpRight,Camera,ChevronLeft,ChevronRight,Compass,Expand,ImagePlus,Minus,Pause,Pencil,Play,Plus,RotateCcw,X} from 'lucide-react';
import {photos as originalPhotos} from '../data';
import {useMediaPreference,usePageVisible} from '../media/useMediaPreference';
import './photo-wall.css';

export type WallPhoto={key:string;id?:number;image:string;title:string};
type Photo=WallPhoto;
type WallProps={photos?:WallPhoto[];production?:boolean;editMode?:boolean;blocked?:boolean;headerControls?:ReactNode;notice?:string;loading?:boolean;onAdd?:()=>void;onEdit?:(photo:WallPhoto)=>void};
type CameraView={x:number;y:number;zoom:number};
type Size={width:number;height:number};
const CELL_X=436;
const CELL_Y=330;
const FRAME_WIDTH=336;
const MIN_ZOOM=.6;
const MAX_ZOOM=1.45;
const titles=['我们一起走过','青春不散场','老地方见','那年夏天','笑得刚刚好'];
const initialPhotos:Photo[]=originalPhotos.map((image,index)=>({key:`original-${index}`,image,title:titles[index]||`回忆${index+1}`}));
const modulo=(number:number,length:number)=>((number%length)+length)%length;
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function GrassBlock(){return <svg viewBox="0 0 48 48" aria-hidden="true" shapeRendering="crispEdges"><path d="m24 3 21 11-21 12L3 14Z" fill="#8a9d58"/><path d="m3 14 21 12v22L3 36Z" fill="#62452f"/><path d="m45 14-21 12v22l21-12Z" fill="#493a2b"/><path d="m3 14 21 12v8l-6-3v-4l-6-3v4l-9-5Z" fill="#748647"/><path d="m45 14-21 12v8l7-4v-4l7-4v4l7-4Z" fill="#4e6737"/><path d="m10 12 8 4 7-4-8-4Zm17-1 7 4 5-3-7-4Z" fill="#acb878"/><path d="m7 29 5 3v4l-5-3Zm10 10 4 2v4l-4-2Z" fill="#8e6740"/><path d="m30 35 5-3v4l-5 3Zm8-10 4-2v4l-4 2Z" fill="#715335"/></svg>}
function Lantern(){return <div className="pw-lantern" aria-hidden="true"><span className="pw-chain"/><svg viewBox="0 0 40 64" shapeRendering="crispEdges"><path d="M15 1h10v4H15zm-4 4h4v9h-4zm14 0h4v9h-4zM8 14h24v6H8zM5 20h30v32H5zm3 32h24v6H8zm5 6h14v4H13z" fill="#423c33"/><path d="M9 23h22v25H9z" fill="#dc9340"/><path d="M13 24h14v22H13z" fill="#ffda80"/><path d="M17 26h7v16h-7z" fill="#fff0b0"/><path d="M7 30h5v5H7zm21 0h5v5h-5zM7 43h26v6H7z" fill="#7e5733"/><path d="M10 17h20v3H10zm0 36h20v3H10z" fill="#726349"/></svg></div>}

function PhotoViewer({photo,index,count,onClose,onMove,onRename,production,canEdit,onEdit}:{photo:Photo;index:number;count:number;onClose:()=>void;onMove:(step:number)=>void;onRename:(key:string,title:string)=>void;production:boolean;canEdit:boolean;onEdit?:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [editing,setEditing]=useState(false);
  const [title,setTitle]=useState(photo.title);
  useEffect(()=>{setEditing(false);setTitle(photo.title)},[photo.key,photo.title]);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const element=dialog.current!;element.showModal();return()=>{element.close();if(previous?.isConnected)previous.focus({preventScroll:true})}},[]);
  return createPortal(<dialog ref={dialog} className="pw-viewer" aria-label={`查看照片：${photo.title}`} onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget)onClose()}} onKeyDown={event=>{if((event.target as HTMLElement).tagName==='INPUT')return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();onMove(event.key==='ArrowLeft'?-1:1)}}}>
    <header className="pw-viewer-head"><div><span className="pw-tiny-block"/><p>取下一段回忆 <small>{index+1} / {count}</small></p></div><button onClick={onClose} aria-label="关闭照片" autoFocus><X size={21}/></button></header>
    <div className="pw-viewer-frame"><img key={photo.image} src={photo.image} alt={photo.title}/></div>
    <footer className="pw-viewer-foot"><button className="pw-square" onClick={()=>onMove(-1)} aria-label="上一张"><ChevronLeft/></button>{production?<div className="pw-sign pw-viewer-sign">{photo.title}{canEdit&&<button className="pw-edit-viewer" onClick={onEdit}><Pencil size={12}/>编辑照片</button>}</div>:editing?<form className="pw-rename" onSubmit={event=>{event.preventDefault();if(title.trim()){onRename(photo.key,[...title.trim()].slice(0,7).join(''));setEditing(false)}}}><input aria-label="照片名牌，最多七个字" maxLength={7} value={title} onChange={event=>setTitle(event.target.value)} autoFocus/><button>挂好名牌</button></form>:<button className="pw-sign pw-viewer-sign" onClick={()=>setEditing(true)} title="点击修改名牌（仅本地预览）">{photo.title}<small>点击改名牌</small></button>}<button className="pw-square" onClick={()=>onMove(1)} aria-label="下一张"><ChevronRight/></button></footer>
    <p className="pw-viewer-note">完整照片 · Esc 放回墙上 {!production&&<span>此预览的改动只在当前页面保留</span>}</p>
  </dialog>,document.body);
}

export default function PhotoWall({photos:providedPhotos,production=false,editMode=false,blocked=false,headerControls,notice:externalNotice,loading=false,onAdd,onEdit}:WallProps){
  const [localPhotos,setPhotos]=useState(initialPhotos);
  const photos=providedPhotos??localPhotos;
  const [selected,setSelected]=useState<string|null>(null);
  const [size,setSize]=useState<Size>({width:1440,height:700});
  const [windowKey,setWindowKey]=useState('');
  const [hud,setHud]=useState({x:0,y:0,zoom:100});
  const [hasMoved,setHasMoved]=useState(false);
  const [paused,setPaused]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [touching,setTouching]=useState(false);
  const [keyboardFocus,setKeyboardFocus]=useState(false);
  const [notice,setNotice]=useState('');
  const viewport=useRef<HTMLDivElement>(null);
  const scene=useRef<HTMLDivElement>(null);
  const upload=useRef<HTMLInputElement>(null);
  const camera=useRef<CameraView>({x:0,y:0,zoom:1});
  const dimensions=useRef(size);
  const selectedRef=useRef<string|null>(null);
  selectedRef.current=selected;
  const reduced=useMediaPreference('(prefers-reduced-motion: reduce)');
  const visible=usePageVisible();
  const motion=useRef(0);
  const glide=useRef(0);
  const lastHud=useRef(0);
  const currentWindow=useRef('');
  const touchStart=useRef<{x:number;y:number}|null>(null);
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const pinch=useRef<{distance:number;zoom:number}|null>(null);
  const suppressClick=useRef(false);
  const localImages=useRef<string[]>([]);

  const paint=useCallback((force=false)=>{
    const view=camera.current;const {width,height}=dimensions.current;
    if(scene.current)scene.current.style.transform=`translate3d(${width/2+view.x}px,${height/2+view.y}px,0) scale(${view.zoom})`;
    const key=`${Math.floor((-view.x-width/2)/view.zoom/CELL_X)}:${Math.floor((-view.y-height/2)/view.zoom/CELL_Y)}:${view.zoom.toFixed(1)}:${width}:${height}`;
    if(force||key!==currentWindow.current){currentWindow.current=key;setWindowKey(key)}
    const now=performance.now();if(force||now-lastHud.current>400){lastHud.current=now;setHud({x:Math.round(-view.x/view.zoom/16),y:Math.round(-view.y/view.zoom/16),zoom:Math.round(view.zoom*100)})}
  },[]);
  const stopMotion=useCallback(()=>{cancelAnimationFrame(motion.current);motion.current=0},[]);
  const zoomAt=useCallback((next:number,screenX?:number,screenY?:number)=>{
    const view=camera.current;const {width,height}=dimensions.current;
    const px=(screenX??width/2)-width/2;const py=(screenY??height/2)-height/2;
    const zoom=clamp(next,MIN_ZOOM,MAX_ZOOM);
    camera.current={x:px-(px-view.x)*zoom/view.zoom,y:py-(py-view.y)*zoom/view.zoom,zoom};paint(true);
  },[paint]);
  const home=()=>{camera.current={x:0,y:0,zoom:dimensions.current.width<650?.77:1};paint(true)};
  const autoPaused=paused||hovered||touching||keyboardFocus||selected!==null||reduced||!visible||blocked||editMode;
  useEffect(()=>{
    stopMotion();
    if(reduced||!visible||selected!==null||touching||keyboardFocus||blocked||editMode){glide.current=0;return;}
    let previous=performance.now();
    const tick=(now:number)=>{const elapsed=Math.min(now-previous,48)/1000;previous=now;glide.current+=((autoPaused?0:1)-glide.current)*(1-Math.exp(-elapsed*9));camera.current.x-=16*elapsed*glide.current;camera.current.y-=4*elapsed*glide.current;paint();if(autoPaused&&glide.current<.005){glide.current=0;motion.current=0;paint(true);return;}motion.current=requestAnimationFrame(tick)};
    motion.current=requestAnimationFrame(tick);
    return stopMotion;
  },[autoPaused,reduced,visible,selected,touching,keyboardFocus,blocked,editMode,paint,stopMotion]);
  useEffect(()=>{if(selected&&!photos.some(photo=>photo.key===selected))setSelected(null)},[photos,selected]);
  useLayoutEffect(()=>{
    const element=viewport.current!;
    let initialized=false;
    const observer=new ResizeObserver(()=>{const next={width:element.clientWidth,height:element.clientHeight};dimensions.current=next;setSize(next);if(!initialized){camera.current.zoom=next.width<650?.77:1;initialized=true}paint(true)});
    observer.observe(element);return()=>observer.disconnect();
  },[paint]);
  useEffect(()=>{
    const element=viewport.current!;
    const wheel=(event:WheelEvent)=>{if(selectedRef.current)return;event.preventDefault();const box=element.getBoundingClientRect();zoomAt(camera.current.zoom*Math.exp(-clamp(event.deltaY,-100,100)*.0018),event.clientX-box.left,event.clientY-box.top);setHasMoved(true)};
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[zoomAt]);
  useEffect(()=>{const timer=setTimeout(()=>setHasMoved(true),4500);return()=>clearTimeout(timer)},[]);
  useEffect(()=>()=>{for(const url of localImages.current)URL.revokeObjectURL(url)},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer)},[notice]);

  const tiles=useMemo(()=>{
    if(!photos.length)return [];
    const view=camera.current;
    const left=(-size.width/2-view.x)/view.zoom;
    const top=(-size.height/2-view.y)/view.zoom;
    const firstCol=Math.floor(left/CELL_X)-1;const lastCol=Math.ceil((left+size.width/view.zoom)/CELL_X)+1;
    const firstRow=Math.floor(top/CELL_Y)-1;const lastRow=Math.ceil((top+size.height/view.zoom)/CELL_Y)+1;
    const result:{key:string;col:number;row:number;x:number;y:number;photo:Photo;lantern:boolean}[]=[];
    for(let row=firstRow;row<=lastRow;row++)for(let col=firstCol;col<=lastCol;col++){
      const index=modulo(col+row*(Math.floor(photos.length/2)+1),photos.length);
      result.push({key:`${col}:${row}`,col,row,x:col*CELL_X+modulo(row,2)*CELL_X/2-FRAME_WIDTH/2,y:row*CELL_Y-124,photo:photos[index],lantern:modulo(col+row*2,4)===0});
    }
    return result;
  },[photos,size,windowKey]);

  const down=(event:PointerEvent<HTMLDivElement>)=>{
    if(selected||event.pointerType!=='touch')return;
    setTouching(true);setHasMoved(true);suppressClick.current=false;
    touchStart.current={x:event.clientX,y:event.clientY};
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera.current.zoom};suppressClick.current=true;event.currentTarget.setPointerCapture(event.pointerId)}
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    if(!pointers.current.has(event.pointerId))return;
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.current.size===2&&pinch.current){const [a,b]=[...pointers.current.values()];const box=event.currentTarget.getBoundingClientRect();zoomAt(pinch.current.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.current.distance),(a.x+b.x)/2-box.left,(a.y+b.y)/2-box.top);setHasMoved(true);return}
    if(touchStart.current&&Math.hypot(event.clientX-touchStart.current.x,event.clientY-touchStart.current.y)>8)suppressClick.current=true;
  };
  const up=(event:PointerEvent<HTMLDivElement>)=>{
    pointers.current.delete(event.pointerId);pinch.current=null;
    if(event.type==='pointercancel')pointers.current.clear();
    setTouching(pointers.current.size>0);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const openPhoto=(photo:Photo)=>{if(suppressClick.current){suppressClick.current=false;return}setSelected(photo.key)};
  const selectedIndex=photos.findIndex(photo=>photo.key===selected);
  const addPhoto=(file?:File)=>{if(!file)return;if(!file.type.startsWith('image/')){setNotice('请选择图片文件');return}const image=URL.createObjectURL(file);localImages.current.push(image);const key=`local-${Date.now()}`;setPhotos(current=>[{key,image,title:'新的一页'},...current]);setSelected(key);setNotice('已放入本地照片墙，未上传到服务器')};
  const rename=(key:string,title:string)=>setPhotos(current=>current.map(photo=>photo.key===key?{...photo,title}:photo));
  const motionLabel=blocked||editMode?'编辑时暂停':paused?'已暂停漫游':selected?'查看照片中':touching?'触摸暂停中':hovered?'悬停暂停中':keyboardFocus?'键盘浏览中':reduced?'已跟随系统暂停':'正在自然漫游';

  return <div className={production?'pw-app pw-production':'pw-app'}>
    {!production&&<nav className="pw-nav" aria-label="预览导航"><a className="pw-brand" href="/"><b>C</b><span>C106<small>我们的共同存档</small></span></a><div className="pw-nav-links"><a href="/">总览</a><a href="/members">主创</a><a href="/years">纪年</a><a href="/hearts">感情线</a><a className="active" href="#wall"><Camera size={15}/>名场面</a><a href="/guests">嘉宾</a><a href="/messages">留言</a></div><a className="pw-back" href="/moments"><ArrowLeft size={14}/>正式照片墙</a></nav>}
    <header className="pw-header"><div className="pw-heading"><span className="pw-world-mark"><GrassBlock/></span><div><p>十个人的回忆，都有地方安放。</p><h1>名场面<span>我们的回忆墙</span></h1></div></div><img className="pw-header-characters" src="/media/moments-lineup.webp" alt="原来的十位 Minecraft 像素人物" width="2142" height="480" decoding="async"/>{production?<div className="pw-wall-tools">{headerControls}</div>:<div className="pw-preview-note"><i/>本地概念预览<small>自动漫游 · 悬停暂停 · 改动不会上传</small></div>}</header>
    {(externalNotice||loading)&&<p className="pw-load-notice" role="status">{externalNotice||'正在取回更多回忆…'}</p>}
    <main id="wall" className="pw-world" ref={viewport} role="region" aria-label="自动漫游的 Minecraft 照片墙，悬停相框或触摸暂停，方向键浏览，加减键缩放，空格暂停" tabIndex={0}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={event=>{if(event.target!==event.currentTarget)return;pointers.current.delete(event.pointerId);if(pointers.current.size<2)pinch.current=null;setTouching(pointers.current.size>0)}}
      onFocusCapture={event=>setKeyboardFocus((event.target as HTMLElement).matches(':focus-visible'))} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setKeyboardFocus(false)}}
      onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false}}}
      onKeyDown={event=>{if(selected)return;const moves:Record<string,[number,number]>={ArrowLeft:[100,0],ArrowRight:[-100,0],ArrowUp:[0,100],ArrowDown:[0,-100]};if(moves[event.key]){event.preventDefault();event.currentTarget.focus({preventScroll:true});setKeyboardFocus(true);camera.current.x+=moves[event.key][0];camera.current.y+=moves[event.key][1];paint(true);setHasMoved(true)}else if(event.key==='+'||event.key==='='){event.preventDefault();zoomAt(camera.current.zoom+.12)}else if(event.key==='-'){event.preventDefault();zoomAt(camera.current.zoom-.12)}else if(event.key==='Home'){event.preventDefault();home()}else if(event.key===' '&&event.target===event.currentTarget){event.preventDefault();setPaused(value=>!value)}}}>
      <div className="pw-wall-light" aria-hidden="true"/>
      <div className="pw-scene" ref={scene}>{tiles.map(tile=>{
        const view=camera.current;const screenX=size.width/2+view.x+tile.x*view.zoom;const screenY=size.height/2+view.y+tile.y*view.zoom;
        const onScreen=screenX+FRAME_WIDTH*view.zoom>0&&screenX<size.width&&screenY+268*view.zoom>0&&screenY<size.height;
        return <figure className="pw-memory" key={tile.key} aria-hidden={!onScreen} style={{left:tile.x,top:tile.y,'--lamp-hue':modulo(tile.col+tile.row,2)?'.7':'1'} as CSSProperties}>
          <span className="pw-frame-pin" aria-hidden="true"/>
          <button className="pw-item-frame" tabIndex={onScreen?0:-1} aria-label={`取下照片：${tile.photo.title}`} onClick={()=>openPhoto(tile.photo)} onPointerEnter={event=>{if(event.pointerType==='mouse'){setHovered(true);setHasMoved(true)}}} onPointerLeave={event=>{if(event.pointerType==='mouse')setHovered(false)}}>
            <span className="pw-frame-lining"><img src={tile.photo.image} alt={tile.photo.title} width="320" height="180" draggable={false} loading="lazy" decoding="async"/></span><span className="pw-photo-action"><Expand size={18}/></span>
          </button>
          {production&&editMode&&tile.photo.id&&<button className="pw-edit-photo" tabIndex={onScreen?0:-1} aria-label={`编辑照片：${tile.photo.title}`} onClick={()=>onEdit?.(tile.photo)}><Pencil size={14}/></button>}
          <figcaption className="pw-sign"><span>{tile.photo.title}</span><i aria-hidden="true"/><i aria-hidden="true"/></figcaption>{tile.lantern&&<Lantern/>}
        </figure>;
      })}</div>
      <div className="pw-vignette" aria-hidden="true"/>
      {!hasMoved&&<div className="pw-first-hint"><span className="pw-hint-hand"><Compass size={21}/></span><p>不用赶路，回忆会自己过来。<small>悬停或触摸暂停，点击看完整照片</small></p><span className="pw-hint-arrow">↗</span></div>}
    </main>
    <div className="pw-bottom"><div className={`pw-coordinates${autoPaused?' pw-motion-paused':''}`}><span><i/>{motionLabel}</span><p>X <b>{hud.x}</b><em>/</em>Z <b>{hud.y}</b></p><small>{photos.length} 张回忆 · 无限延展</small></div>
      <div className="pw-hotbar-wrap"><p><span className="pw-desktop-help">自动漫游 · 悬停暂停 · 点击取下照片</span><span className="pw-mobile-help">自动漫游 · 触摸暂停 · 点击看大图</span></p><div className="pw-hotbar" aria-label="照片墙工具"><button onClick={()=>zoomAt(camera.current.zoom-.12)} aria-label="缩小照片墙" title="缩小"><Minus size={23}/></button><button onClick={home} aria-label="回到出生点" title="回到出生点"><Compass size={25}/></button><button className="pw-selected-slot" disabled={reduced} onClick={()=>setPaused(value=>!value)} aria-pressed={paused} aria-label={paused?'继续自然漫游':'暂停自然漫游'} title={paused?'继续自然漫游':'暂停自然漫游'}><GrassBlock/><b>{photos.length}</b><i>{paused?<Play size={12}/>:<Pause size={12}/>}</i></button><button onClick={()=>zoomAt(camera.current.zoom+.12)} aria-label="放大照片墙" title="放大"><Plus size={23}/></button><button onClick={()=>production?onAdd?.():upload.current?.click()} aria-label={production?'添加照片':'放一张本地照片'} title={production?'添加照片':'放一张本地照片'}><ImagePlus size={24}/></button></div><small>{hud.zoom}% <span>·</span> <button onClick={home}><RotateCcw size={11}/>回到出生点</button></small></div>
      <div className="pw-world-footer"><span>故事还没结束。</span><small>一直有新的回忆，值得挂上来。</small><ArrowUpRight size={17}/></div>
    </div>
    {!production&&<input ref={upload} type="file" accept="image/*" className="pw-file-input" onChange={event=>{addPhoto(event.target.files?.[0]);event.target.value=''}}/>}
    {notice&&<p className="pw-toast" role="status">{notice}</p>}
    {selectedIndex>=0&&<PhotoViewer photo={photos[selectedIndex]} index={selectedIndex} count={photos.length} onClose={()=>setSelected(null)} onMove={step=>setSelected(photos[modulo(selectedIndex+step,photos.length)].key)} onRename={rename} production={production} canEdit={editMode&&Boolean(photos[selectedIndex].id)} onEdit={()=>{onEdit?.(photos[selectedIndex]);setSelected(null)}}/>}
  </div>;
}
