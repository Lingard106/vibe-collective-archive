import{lazy,Suspense,useEffect,useState}from'react';import{AnimatePresence,motion}from'framer-motion';import{NavLink,Route,Routes}from'react-router-dom';import{BedDouble,Brain,CalendarDays,Camera,ChevronLeft,ChevronRight,Heart,Home,LockKeyhole,MapPin,Menu,MessageCircle,Pause,Play,Users,X}from'lucide-react';import{guests,members,metDate,photos}from'./data';import BirthdayFx,{BirthdayBadge,BirthdayStrip}from'./BirthdayCue';
import Overview from './Overview';
const MilkTeaGift=lazy(()=>import('./gift/MilkTeaGift'));
const MembersPage=lazy(()=>import('./MembersPage'));
const GuestsPage=lazy(()=>import('./GuestsPage'));
const YearsPage=lazy(()=>import('./YearsPage'));
const MomentsPage=lazy(()=>import('./MomentsPage'));
const HeartsPage=lazy(()=>import('./HeartsPage'));
const MessagesPage=lazy(()=>import('./MessagesPage'));
const nav=[['/','总览',Home],['/members','主创',Users],['/years','纪年',CalendarDays],['/hearts','感情线',Heart],['/moments','名场面',Camera],['/guests','嘉宾',Users],['/messages','留言',MessageCircle]]as const;
function Layout(){const[open,setOpen]=useState(false);const[playing,setPlaying]=useState(false);useEffect(()=>{const a=document.querySelector('audio');playing?(a as HTMLAudioElement)?.play():(a as HTMLAudioElement)?.pause()},[playing]);return <div className="app"><nav className="nav"><NavLink to="/" className="logo"><b>C</b><span>C106<small>COLLECTIVE ARCHIVE</small></span><BirthdayBadge/></NavLink><div className={open?'links open':'links'}>{nav.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setOpen(false)}><Icon size={15}/>{label}</NavLink>)}</div><button className="music" onClick={()=>setPlaying(!playing)}>{playing?<Pause size={15}/>:<Play size={15}/>}<span><b>Otto — It's a Vibe</b><small>{playing?'正在播放':'点击播放'}</small></span></button><button className="hamb" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><audio loop src="/media/bgm.mp3"/></nav><main><AnimatePresence mode="wait"><Routes><Route path="/" element={<Overview/>}/><Route path="/members" element={<Members/>}/><Route path="/years" element={<Years/>}/><Route path="/hearts" element={<Hearts/>}/><Route path="/moments" element={<Moments/>}/><Route path="/guests" element={<Guests/>}/><Route path="/messages" element={<Messages/>}/></Routes></AnimatePresence></main><BirthdayStrip/><BirthdayFx/></div>}
function Members(){return <Suspense fallback={<div className="page members-page"/>}><MembersPage staticMembers={members}/></Suspense>}
function Years(){return <Suspense fallback={<div className="page"/>}><YearsPage/></Suspense>}
function Hearts(){return <Suspense fallback={<div className="page"/>}><HeartsPage members={members}/></Suspense>}
function Moments(){return <Suspense fallback={<div className="page"/>}><MomentsPage staticPhotos={photos}/></Suspense>}
function Guests(){return <Suspense fallback={<div className="page"/>}><GuestsPage staticGuests={guests}/></Suspense>}
function Messages(){return <Suspense fallback={<div className="page"/>}><MessagesPage/></Suspense>}
function Header({over,title,desc}:{over:string,title:string,desc:string}){return <header className="page-head"><div><p className="kicker">{over}</p><h1>{title}</h1></div><p>{desc}</p></header>}
export default function App(){return <><Layout/><Suspense fallback={null}><MilkTeaGift/></Suspense></>}
