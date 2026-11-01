import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router-dom';
import {ArrowUpRight,Hand,MousePointer2,Sparkles,X} from 'lucide-react';
import './character-update-notice.css';

const SEEN_KEY='c106:character-update:2026-11-01';
let dismissedInMemory=false;
function shouldShow(){
  if(dismissedInMemory)return false;
  try{return localStorage.getItem(SEEN_KEY)!=='seen'}catch{return true}
}

// Only mounted on the overview: a versioned invitation, never an obstacle on
// the character page. Storage is optional, so private browsing still works.
export default function CharacterUpdateNotice(){
  const [open,setOpen]=useState(shouldShow);
  const dialog=useRef<HTMLDialogElement>(null);
  const navigate=useNavigate();
  const dismiss=()=>{
    dismissedInMemory=true;
    try{localStorage.setItem(SEEN_KEY,'seen')}catch{/* Dismiss for this tab. */}
    setOpen(false);
  };
  useEffect(()=>{
    if(!open)return;
    const element=dialog.current!;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    if(!element.open)element.showModal();
    return()=>{
      element.close();
      document.body.style.overflow=previousOverflow;
    };
  },[open]);
  if(!open)return null;
  return createPortal(<dialog ref={dialog} className="character-update-notice" aria-labelledby="character-update-title" aria-describedby="character-update-intro" onCancel={event=>{event.preventDefault();dismiss()}} onClick={event=>{if(event.target===event.currentTarget)dismiss()}}>
    <div className="character-update-content">
      <button className="character-update-close" type="button" aria-label="关闭角色更新提示" onClick={dismiss}><X size={19}/></button>
      <div className="character-update-stamp" aria-hidden="true"><span/><span/><span/><span/></div>
      <p className="character-update-date">11 月角色互动更新</p>
      <h2 id="character-update-title">主创角色，动起来了。</h2>
      <p id="character-update-intro" className="character-update-intro">去主创页，试着点一点林加德。<br/>他会用不同的动作回应你。</p>
      <div className="character-update-features">
        <div><MousePointer2 size={19}/><p><strong>点击，收获一个小回应</strong><span>挥手、张臂庆祝，或是一次 Siu！</span></p></div>
        <div><Hand size={19}/><p><strong>不点击，也有自己的小动作</strong><span>笑一下、踮脚探头，再举手向你招呼。</span></p></div>
      </div>
      <p className="character-update-next"><Sparkles size={14}/><span>本次先开放林加德，其他成员保持原样。<br/>接下来会继续打磨人物动作与互动细节。</span></p>
      <div className="character-update-actions">
        <button className="character-update-primary" type="button" autoFocus onClick={()=>{dismiss();navigate('/members')}}>去主创页看看<ArrowUpRight size={17}/></button>
        <button className="character-update-secondary" type="button" onClick={dismiss}>继续浏览</button>
      </div>
      <small className="character-update-footnote">看过本次更新后，不再重复提醒。</small>
    </div>
  </dialog>,document.body);
}
