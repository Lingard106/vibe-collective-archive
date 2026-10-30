import{lazy,Suspense,useContext,useEffect,useMemo,useState}from'react';
import{BedDouble,Brain,ChevronLeft,ChevronRight,LoaderCircle,LockKeyhole,MapPin,Pencil,Save,X}from'lucide-react';
import type{MemberProfile}from'./data';
import AbilityRadar from'./AbilityRadar';
import'./members-editor.css';
import CrossfadeImage from './media/CrossfadeImage';
import {prepareImage, profileImageSrc} from './media/image-loader';
import {MemberArtworkContext} from './MemberArtworkContext';
const AnimatedPortrait=lazy(()=>import('./world-preview/ImagePortraitStage'));

type DbProfile={member_id:string;nickname:string;english_name:string;aliases:string;avatar:string;quote:string;bed:string;region:string;mbti:string;buffs:string;debuffs:string;stats:string};
type EditableMember=Omit<MemberProfile,'hero'>;
const toWebp=(src:string)=>src.replace(/\.(png|jpg|jpeg)$/i,'.webp');
const imageSrc=(src:string)=>src.startsWith('data:')?src:src.includes('-profile.')?toWebp(src):src;
const Img=({src,...props}:React.ImgHTMLAttributes<HTMLImageElement>&{src:string})=><img src={imageSrc(src)} loading="lazy" decoding="async" {...props}/>;
const parseList=(value:string,fallback:string[])=>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(String):fallback}catch{return fallback}};
const parseStats=(value:string,fallback:MemberProfile['stats'])=>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(x=>({name:String(x.name),value:Number(x.value)})):fallback}catch{return fallback}};
function mergeMember(base:MemberProfile,row?:DbProfile):MemberProfile{if(!row)return base;return{...base,nickname:row.nickname||base.nickname,englishName:row.english_name||base.englishName,aliases:parseList(row.aliases,base.aliases),avatar:row.avatar||base.avatar,quote:row.quote||base.quote,bed:row.bed||base.bed,region:row.region||base.region,mbti:row.mbti||base.mbti,buffs:parseList(row.buffs,base.buffs),debuffs:parseList(row.debuffs,base.debuffs),stats:parseStats(row.stats,base.stats),hero:base.hero}}
async function webpAvatar(file:File){const bitmap=await createImageBitmap(file);const size=Math.min(bitmap.width,bitmap.height);const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.getContext('2d')!.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,400,400);bitmap.close();let quality=.9;let blob:Blob|null=null;do{blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));quality-=.08}while(blob&&blob.size>100*1024&&quality>=.5);if(!blob)throw new Error('头像处理失败');return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob!)})}
function editable(member:MemberProfile):EditableMember{const{hero:_,...rest}=member;return structuredClone(rest)}
function payload(member:EditableMember){return{nickname:member.nickname,english_name:member.englishName,aliases:member.aliases,avatar:member.avatar,quote:member.quote,bed:member.bed,region:member.region,mbti:member.mbti,buffs:member.buffs,debuffs:member.debuffs,stats:member.stats}}

function MemberEditor({member,onClose,onSaved}:{member:MemberProfile;onClose:()=>void;onSaved:(row:DbProfile)=>void}){const[authorized,setAuthorized]=useState(false);const[birthday,setBirthday]=useState('');const[form,setForm]=useState(()=>editable(member));const[busy,setBusy]=useState(false);const[error,setError]=useState('');const auth=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/members/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_id:member.id,birthday})});const data=await response.json();if(!response.ok)throw new Error(data.error||'验证失败');setAuthorized(true)}catch(e){setError(e instanceof Error?e.message:'验证失败')}finally{setBusy(false)}};const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const response=await fetch(`/api/members/${member.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload(form))});const data=await response.json();if(!response.ok)throw new Error(data.error||'保存失败');onSaved(data.profile);onClose()}catch(e){setError(e instanceof Error?e.message:'保存失败')}finally{setBusy(false)}};return <div className="member-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="member-modal"><header><div><small>MEMBER DOSSIER</small><h2>{authorized?'编辑个人资料':'验证成员身份'}</h2></div><button onClick={onClose} aria-label="关闭"><X/></button></header>{!authorized?<form className="member-auth" onSubmit={auth}><LockKeyhole size={36}/><p>输入你自己的完整生日后，即可编辑当前人物资料。</p><label><span>当前成员</span><strong>{member.nickname}</strong></label><label><span>完整生日</span><input type="date" required value={birthday} onChange={e=>setBirthday(e.target.value)}/></label>{error&&<p className="member-error">{error}</p>}<button className="member-primary" disabled={busy}>{busy?<LoaderCircle className="spin"/>:'验证并进入编辑'}</button></form>:<form className="member-edit-form" onSubmit={save}><div className="member-avatar-field"><Img src={form.avatar}/><label><span>更换头像</span><small>自动处理为 400×400 WebP</small><input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(file)try{setForm({...form,avatar:await webpAvatar(file)})}catch(err){setError(err instanceof Error?err.message:'图片处理失败')}}}/></label></div><div className="member-form-grid"><label><span>中文昵称</span><input value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/></label><label><span>英文名</span><input value={form.englishName} onChange={e=>setForm({...form,englishName:e.target.value})}/></label><label className="wide"><span>别名（逗号分隔）</span><input value={form.aliases.join('，')} onChange={e=>setForm({...form,aliases:e.target.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean)})}/></label><label className="wide"><span>名言</span><textarea value={form.quote} onChange={e=>setForm({...form,quote:e.target.value})}/></label><label><span>床号</span><input value={form.bed} onChange={e=>setForm({...form,bed:e.target.value})}/></label><label><span>地区</span><input value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/></label><label><span>MBTI</span><input value={form.mbti} onChange={e=>setForm({...form,mbti:e.target.value})}/></label><label className="wide"><span>BUFFS（逗号分隔）</span><input value={form.buffs.join('，')} onChange={e=>setForm({...form,buffs:e.target.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean)})}/></label><label className="wide"><span>DEBUFFS（逗号分隔）</span><input value={form.debuffs.join('，')} onChange={e=>setForm({...form,debuffs:e.target.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean)})}/></label></div><fieldset><legend>雷达数值 <small>标准边界为 100，允许填写更大数值并突破边界</small></legend><div className="member-stat-grid">{form.stats.map((stat,index)=><label key={`${stat.name}-${index}`}><span>{stat.name}</span><input type="number" min="0" max="10000" value={stat.value} onChange={e=>{const stats=[...form.stats];stats[index]={...stat,value:Number(e.target.value)};setForm({...form,stats})}}/></label>)}</div></fieldset>{error&&<p className="member-error">{error}</p>}<footer><button type="button" onClick={onClose}>取消</button><button className="member-primary" disabled={busy}><Save size={17}/>{busy?'保存中…':'保存资料'}</button></footer></form>}</section></div>}


export default function MembersPage({staticMembers}:{staticMembers:MemberProfile[]}) {
 const renderArtwork=useContext(MemberArtworkContext);
 const [rows,setRows]=useState<DbProfile[]>([]);
 const [active,setActive]=useState(0);
 const [visibleActive,setVisibleActive]=useState(0);
 const [collapsed,setCollapsed]=useState(false);
 const [switching,setSwitching]=useState(true);
 const [imageError,setImageError]=useState('');
 const [retry,setRetry]=useState(0);
 const [editing,setEditing]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/members',{signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(data=>setRows(data.profiles||[])).catch(()=>{});return()=>controller.abort()},[]);
 const members=useMemo(()=>staticMembers.map(member=>mergeMember(member,rows.find(row=>row.member_id===member.id))),[staticMembers,rows]);
 const m=members[visibleActive];
 const portrait=(surface:'background'|'cover')=>{
  const fallback=surface==='background'?<CrossfadeImage className="member-page-bg" src={profileImageSrc(m.hero)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Img className="mobile-profile-cover" src={m.hero} loading="eager" alt=""/>;
  return renderArtwork?.(m,surface)??(m.id==='lingard'?<Suspense fallback={fallback}><AnimatedPortrait key={m.id+'-'+surface} src={profileImageSrc(m.hero)} surface={surface}/></Suspense>:fallback);
 };
 const target=members[active];
 useEffect(()=>{
  let current=true;
  setSwitching(true);setImageError('');
  prepareImage(profileImageSrc(target.hero)).then(()=>{
   if(current){setVisibleActive(active);setSwitching(false)}
  }).catch(error=>{if(current){setSwitching(false);setImageError(error instanceof Error?error.message:'图片暂时无法加载')}});
  return()=>{current=false};
 },[active,target.hero,retry]);
 return <section className={`page members-page${switching?' member-switching':''}`}>
  {portrait('background')}
  <div className="member-page-shade"/>
  <div className="member-strip">{members.map((member,index)=><button
   className={index===active?'active':''} aria-pressed={index===active} key={member.id}
   onClick={()=>{setActive(index);setRetry(value=>value+1)}}
   onFocus={()=>void prepareImage(profileImageSrc(member.hero)).catch(()=>{})}
   onMouseEnter={()=>void prepareImage(profileImageSrc(member.hero)).catch(()=>{})}>
   {member.avatar?<Img src={member.avatar}/>:<span>{String(index+1).padStart(2,'0')}</span>}
   <div><b>{member.nickname}</b><small>{member.aliases.join('·')}</small></div>
  </button>)}</div>
  {imageError&&<div className="image-retry" role="status">{imageError}<button onClick={()=>setRetry(value=>value+1)}>重试切换</button></div>}
  <section className="profile" aria-busy={switching}>
   <div className="profile-watermark">{m.englishName}</div>
   <button className="collapse" aria-label={collapsed?'展开人物资料':'收起人物资料'} onClick={()=>setCollapsed(!collapsed)}>{collapsed?<ChevronLeft/>:<ChevronRight/>}</button>
   <aside key={m.id} className={collapsed?'collapsed':''}>
    {portrait('cover')}
    <p className="profile-english">{m.englishName}</p><h2>{m.nickname}</h2><p className="profile-aliases">{m.aliases.join(' · ')}</p>
    <blockquote>“{m.quote}”</blockquote>
    <div className="profile-metrics"><div><BedDouble size={19}/><small>床号</small><strong>{m.bed}</strong></div><div><MapPin size={19}/><small>地区</small><strong>{m.region}</strong></div><div><Brain size={19}/><small>MBTI</small><strong>{m.mbti}</strong></div></div>
    <div className="profile-lower"><div><h3>ABILITY RADAR</h3><Suspense fallback={<div className="radar"/>}><AbilityRadar stats={m.stats}/></Suspense></div><div className="profile-notes"><h3>PROFILE NOTES</h3><b>BUFFS</b><div className="effect-tags">{m.buffs.map(item=><span key={item}>{item}</span>)}</div><b>DEBUFFS</b><div className="effect-tags debuffs">{m.debuffs.map(item=><span key={item}>{item}</span>)}</div></div></div>
    <div className="member-card-actions"><button className="member-self-edit" disabled={switching} onClick={()=>setEditing(true)}><Pencil size={15}/>编辑我的资料</button></div>
   </aside>
  </section>
  {editing&&<MemberEditor key={m.id} member={m} onClose={()=>setEditing(false)} onSaved={row=>setRows(current=>[...current.filter(item=>item.member_id!==row.member_id),row])}/>}
 </section>;
}
