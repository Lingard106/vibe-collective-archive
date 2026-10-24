import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Check, Copy, Gift, LoaderCircle, Sparkles, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import './gift.css';

type GiftState = {state:'available'|'claimed'|'mine';nickname?:string;receipt?:string};
let initialization: Promise<GiftState> | undefined;
let inFlight: Promise<GiftState> | undefined;
function readGift(refresh = false) {
  // Reuse the active request so StrictMode / opening during arrival cannot rotate the owner cookie.
  if (inFlight) return inFlight;
  if (!initialization || refresh) {
    const fetchState = () => fetch('/api/gift', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)})
      .then(async response => {const body = await response.json();if(!response.ok)throw new Error(body.error||'礼包暂时无法连接');return body as GiftState;});
    // Serialise cookie bootstrap across tabs, not just React effects in this tab.
    initialization = navigator.locks ? navigator.locks.request('c106-gift-identity', {signal:AbortSignal.timeout(20000)}, fetchState) : Promise.reject(new Error('请使用新版浏览器打开礼包，以安全保存你的领取凭证。'));
    inFlight = initialization;
    void initialization.then(() => {inFlight = undefined;}, () => {initialization = undefined;inFlight = undefined;});
  }
  return initialization;
}
function MilkTeaArt() {
  return <svg className="milk-tea-art" viewBox="0 0 120 150" aria-hidden="true"><path d="M76 10 59 91" stroke="#bd8b46" strokeWidth="9"/><path d="M28 43h64l-9 89q-23 15-46 0Z" fill="#e9c996" stroke="#9e7042" strokeWidth="3"/><path d="m32 75 5 57q23 15 46 0l6-57Z" fill="#b88a57"/><path d="M25 43q35-15 70 0v9H25Z" fill="#f2e5c4" stroke="#9e7042" strokeWidth="3"/>{[[46,119],[61,124],[75,119],[53,105],[69,105]].map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="#423121"/>)}<path d="m42 61 3 31" stroke="#fff4d7" strokeWidth="5" opacity=".55" strokeLinecap="round"/></svg>;
}
export default function MilkTeaGift() {
  const {pathname} = useLocation();
  const [visible,setVisible] = useState(false);
  const [open,setOpen] = useState(false);
  const [data,setData] = useState<GiftState|null>(null);
  const [nickname,setNickname] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [checking,setChecking] = useState(false);
  const [copied,setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      try {if(sessionStorage.getItem('c106-gift-dismissed'))return;} catch {}
      setVisible(true);
      void readGift().then(state=>{if(active)setData(state)}).catch(reason=>{if(active)setError(reason.message)});
    }, 3500);
    return () => {active=false;clearTimeout(timer);};
  }, []);
  useEffect(() => {
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    const element=dialog.current!;
    element.showModal();
    let active=true;setChecking(true);setError('');
    void readGift(true).then(state=>{if(active)setData(state)}).catch(reason=>{if(active)setError(reason.message)}).finally(()=>{if(active)setChecking(false)});
    return()=>{active=false;element.close();if(previous?.isConnected)previous.focus({preventScroll:true})};
  },[open]);
  const claim = async(event:React.FormEvent) => {
    event.preventDefault();if(busy||checking)return;
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/gift',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if(!response.ok&&response.status!==409)throw new Error(result.error||'领取结果暂时未确认，请重试');
      setData(result);initialization=Promise.resolve(result);
    } catch(reason) {setError(reason instanceof Error&&reason.name!=='TimeoutError'?reason.message:'网络有些慢，请重试。重复提交不会重复领取。');}
    finally {setBusy(false);}
  };
  const dismiss=()=>{setVisible(false);try{sessionStorage.setItem('c106-gift-dismissed','1')}catch{}};
  if(!visible)return null;
  const mine=data?.state==='mine';const claimed=data?.state==='claimed';
  return <>
    <div className={`gift-drop${pathname==='/messages'?' gift-over-composer':''}`}>
      <button className="gift-dismiss" onClick={dismiss} aria-label="暂时收起礼包"><X size={14}/></button>
      <button className="gift-discovery" onClick={()=>setOpen(true)} aria-label={mine?'查看奶茶领取凭证':'打开从天而降的小礼包'}>
        <span className="gift-halo"/><img src="/media/milk-tea-gift.webp" alt="蓝色缎带与金色封蜡的方块礼箱" width="128" height="110" decoding="async"/>
        <span className="gift-discovery-label"><Sparkles size={12}/>{mine?'你的奶茶凭证':'有份小惊喜'}</span>
      </button>
    </div>
    {open&&createPortal(<dialog ref={dialog} aria-labelledby="gift-title" className={`gift-dialog${mine?' gift-won':''}`} onCancel={event=>{event.preventDefault();if(!busy)setOpen(false)}}>
      <div className="gift-dialog-inner">
        <button className="gift-close" disabled={busy} onClick={()=>setOpen(false)} aria-label="关闭礼包"><X size={20}/></button>
        <div className="gift-scene" aria-hidden="true"><span className="gift-orbit"/><span className="gift-orbit second"/>{Array.from({length:9},(_,index)=><i className="gift-star" key={index} style={{left:`${9+(index*37)%85}%`,top:`${10+(index*23)%72}%`,animationDelay:`${index*.08}s`}}/>)}<img src="/media/milk-tea-gift.webp" alt=""/>{mine&&<div className="gift-tea-stamp"><MilkTeaArt/></div>}</div>
        <div className="gift-copy"><span className="gift-eyebrow"><Gift size={14}/>C106 的隐藏惊喜</span>
          <h2 id="gift-title">{mine?'这杯，林加德请。':claimed?'哎呀，晚了一小步。':'有一杯奶茶，等你发现。'}</h2>
          <p>{mine?`${data.nickname}，你拿到了这份唯一的小幸运。`:claimed?'礼包已经被领走了。故事还在继续，下次好运也许就轮到你。':'留个大家认识的昵称，确认后就可以找林加德领一杯奶茶。全站只有一份，先确认先得。'}</p>
          {checking?<div className="gift-checking" role="status"><LoaderCircle className="spin" size={18}/>正在打开封蜡…</div>:mine?<div className="gift-ticket">
            <div className="gift-ticket-head"><span>奶茶兑换凭证</span><b>壹杯</b></div><strong>{data.nickname}</strong><code>{data.receipt}</code>
            <button onClick={()=>{if(!navigator.clipboard){setError('请截图保存凭证');return;}void navigator.clipboard.writeText(data.receipt||'').then(()=>setCopied(true)).catch(()=>setError('复制未成功，请截图保存凭证'));}}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'已复制':'复制凭证'}</button>
            <small>请截图保存，联系林加德兑换。换设备或清除浏览数据后，本站无法自动找回。</small>
          </div>:claimed?<div className="gift-empty"><Check size={18}/><span>已经被领走了</span></div>:data?.state==='available'?<form onSubmit={claim} className="gift-claim-form">
            <label htmlFor="gift-nickname">怎么称呼你？</label><input id="gift-nickname" value={nickname} onChange={event=>setNickname(event.target.value)} placeholder="大家认识的昵称" maxLength={24} autoComplete="nickname" required disabled={busy}/>
            <button disabled={busy||!nickname.trim()}>{busy?<LoaderCircle className="spin" size={18}/>:<Sparkles size={18}/>} {busy?'正在确认你的幸运…':'确认领取这杯奶茶'}</button>
            <small>昵称仅供林加德核对，不会展示给其他访客。</small>
          </form>:<button className="gift-reconnect" onClick={()=>{setChecking(true);void readGift(true).then(setData).then(()=>setError('')).catch(reason=>setError(reason.message)).finally(()=>setChecking(false));}}>重新连接礼包</button>}
          {error&&<p className="gift-error" role="alert">{error}</p>}
        </div>
      </div>
    </dialog>,document.body)}
  </>;
}
