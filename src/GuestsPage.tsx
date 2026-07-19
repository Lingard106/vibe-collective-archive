import{useCallback,useEffect,useState}from'react';
import{ImagePlus,LoaderCircle,Pencil,Plus,Quote,Trash2,X}from'lucide-react';
import'./guests.css';

type Guest={id?:number;alias:string;desc:string;avatar?:string;tags?:string;quote?:string;created_at?:string};
type GuestForm={alias:string;desc:string;avatar:string;tags:string;quote:string};
const EMPTY_FORM:GuestForm={alias:'',desc:'',avatar:'',tags:'',quote:''};
const MAX_AVATAR_BYTES=80*1024;

function readAsDataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('头像读取失败'));reader.readAsDataURL(blob)})}
function canvasBlob(canvas:HTMLCanvasElement,quality:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('浏览器无法转换这张图片')),'image/webp',quality))}
function loadImage(file:File){return new Promise<HTMLImageElement>((resolve,reject)=>{const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('无法识别这张图片'))};image.src=url})}
async function compressAvatar(file:File){
 const image=await loadImage(file);
 let width=image.naturalWidth,height=image.naturalHeight;
 const scale=Math.min(1,400/width,400/height);width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
 const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器不支持图片压缩');
 const qualities=[.92,.86,.8,.74,.68,.6,.52,.44];
 for(let pass=0;pass<4;pass++){
  canvas.width=width;canvas.height=height;ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
  for(const quality of qualities){const blob=await canvasBlob(canvas,quality);if(blob.size<=MAX_AVATAR_BYTES)return readAsDataUrl(blob)}
  width=Math.max(160,Math.round(width*.82));height=Math.max(160,Math.round(height*.82));
 }
 throw new Error('图片内容过于复杂，压缩后仍超过 80KB，请换一张图片');
}

export default function GuestsPage({staticGuests}:{staticGuests:{alias:string;desc:string}[]}){
 const[apiGuests,setApiGuests]=useState<Guest[]>([]);const[loading,setLoading]=useState(true);const[notice,setNotice]=useState('');const[modalOpen,setModalOpen]=useState(false);const[editing,setEditing]=useState<Guest|null>(null);const[form,setForm]=useState<GuestForm>(EMPTY_FORM);const[saving,setSaving]=useState(false);const[imageBusy,setImageBusy]=useState(false);
 const loadGuests=useCallback(async()=>{try{const response=await fetch('/api/guests',{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('暂时无法连接嘉宾数据库');const data=await response.json()as{guests?:Guest[]};setApiGuests(Array.isArray(data.guests)?data.guests:[]);setNotice('')}catch(error){setNotice(error instanceof Error?error.message:'嘉宾数据库加载失败')}finally{setLoading(false)}},[]);
 useEffect(()=>{void loadGuests()},[loadGuests]);
 useEffect(()=>{if(!modalOpen)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!saving)setModalOpen(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[modalOpen,saving]);
 const openAdd=()=>{setEditing(null);setForm(EMPTY_FORM);setNotice('');setModalOpen(true)};
 const openEdit=(guest:Guest)=>{setEditing(guest);setForm({alias:guest.alias,desc:guest.desc||'',avatar:guest.avatar||'',tags:guest.tags||'',quote:guest.quote||''});setNotice('');setModalOpen(true)};
 const chooseAvatar=async(file?:File)=>{if(!file)return;setImageBusy(true);setNotice('');try{const avatar=await compressAvatar(file);setForm(current=>({...current,avatar}))}catch(error){setNotice(error instanceof Error?error.message:'头像处理失败')}finally{setImageBusy(false)}};
 const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!form.alias.trim()||saving||imageBusy)return;setSaving(true);setNotice('');try{const editingId=editing?.id;const response=await fetch(editingId?`/api/guests/${editingId}`:'/api/guests',{method:editingId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,alias:form.alias.trim(),desc:form.desc.trim(),tags:form.tags.trim(),quote:form.quote.trim()})});const data=await response.json().catch(()=>({}))as{error?:string};if(!response.ok)throw new Error(data.error||'保存失败，请稍后重试');await loadGuests();setModalOpen(false)}catch(error){setNotice(error instanceof Error?error.message:'保存失败，请稍后重试')}finally{setSaving(false)}};
 const removeGuest=async()=>{if(!editing?.id||saving||!window.confirm(`确定删除「${editing.alias}」吗？`))return;setSaving(true);setNotice('');try{const response=await fetch(`/api/guests/${editing.id}`,{method:'DELETE'});const data=await response.json().catch(()=>({}))as{error?:string};if(!response.ok)throw new Error(data.error||'删除失败');await loadGuests();setModalOpen(false)}catch(error){setNotice(error instanceof Error?error.message:'删除失败')}finally{setSaving(false)}};
 return <section className="page guests-editor-page">
  <header className="guests-editor-head"><div><p className="kicker">PEOPLE WE MET</p><h1>特别嘉宾</h1></div><div className="guests-editor-intro"><p>只显示外号和相遇描述，不公开真实姓名。</p><button className="guest-add" onClick={openAdd}><Plus size={17}/>添加嘉宾</button></div></header>
  {notice&&!modalOpen&&<p className="guest-notice" role="status">{notice}，静态档案仍可正常浏览。</p>}
  <div className="guest-editor-grid">
   {staticGuests.map((guest,index)=><article className="guest-editor-card guest-static" key={`static-${guest.alias}`}><div className="guest-card-top"><span>{String(index+1).padStart(2,'0')}</span><small>静态档案</small></div><div className="guest-editor-avatar">?</div><h3>「{guest.alias}」</h3><p>{guest.desc}</p></article>)}
   {apiGuests.map((guest,index)=><article className="guest-editor-card" key={guest.id}><div className="guest-card-top"><span>{String(staticGuests.length+index+1).padStart(2,'0')}</span><button onClick={()=>openEdit(guest)} aria-label={`编辑 ${guest.alias}`}><Pencil size={14}/>编辑</button></div><div className={`guest-editor-avatar ${guest.avatar?'has-image':''}`}>{guest.avatar?<img src={guest.avatar} alt="" loading="lazy" decoding="async"/>:'?'}</div><h3>「{guest.alias}」</h3>{guest.tags&&<div className="guest-tags">{guest.tags.split(',').map(tag=>tag.trim()).filter(Boolean).map(tag=><span key={tag}>{tag}</span>)}</div>}<p>{guest.desc}</p>{guest.quote&&<blockquote><Quote size={14}/>{guest.quote}</blockquote>}</article>)}
   {loading&&<article className="guest-editor-card guest-loading"><LoaderCircle className="spin"/><p>正在读取嘉宾档案…</p></article>}
  </div>
  {modalOpen&&<div className="guest-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)setModalOpen(false)}}><div className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="guest-form-title"><div className="guest-modal-head"><div><p className="kicker">GUEST ARCHIVE</p><h2 id="guest-form-title">{editing?'编辑嘉宾':'添加嘉宾'}</h2></div><button className="guest-modal-close" onClick={()=>setModalOpen(false)} disabled={saving} aria-label="关闭"><X/></button></div><form onSubmit={submit}>
   <label><span>别名 *</span><input required maxLength={80} value={form.alias} onChange={event=>setForm({...form,alias:event.target.value})} placeholder="嘉宾的公开称呼"/></label>
   <label><span>描述</span><textarea maxLength={2000} rows={4} value={form.desc} onChange={event=>setForm({...form,desc:event.target.value})} placeholder="记录与这位嘉宾相遇的故事"/></label>
   <label><span>Tag</span><input maxLength={500} value={form.tags} onChange={event=>setForm({...form,tags:event.target.value})} placeholder="朋友, 旅途, 2026（逗号分隔）"/></label>
   <label><span>名言</span><input maxLength={500} value={form.quote} onChange={event=>setForm({...form,quote:event.target.value})} placeholder="留下一句代表性的话"/></label>
   <label className="guest-avatar-field"><span>头像</span><div className="guest-avatar-input">{form.avatar?<img src={form.avatar} alt="头像预览"/>:<ImagePlus size={28}/>}<div><b>{imageBusy?'正在压缩…':form.avatar?'更换头像':'选择头像'}</b><small>自动转为 WebP，最大 400×400、80KB</small></div><input type="file" accept="image/*" disabled={imageBusy||saving} onChange={event=>void chooseAvatar(event.target.files?.[0])}/></div>{form.avatar&&<button type="button" className="guest-remove-avatar" onClick={()=>setForm({...form,avatar:''})}>移除头像</button>}</label>
   {notice&&<p className="guest-form-error" role="alert">{notice}</p>}
   <div className="guest-form-actions">{editing&&<button type="button" className="guest-delete" onClick={removeGuest} disabled={saving}><Trash2 size={16}/>删除</button>}<span/><button type="button" className="guest-cancel" onClick={()=>setModalOpen(false)} disabled={saving}>取消</button><button className="guest-save" disabled={saving||imageBusy||!form.alias.trim()}>{saving?<><LoaderCircle className="spin" size={17}/>保存中…</>:editing?'保存修改':'添加嘉宾'}</button></div>
  </form></div></div>}
 </section>
}
