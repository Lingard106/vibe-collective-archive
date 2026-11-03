import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import App from '../App';
import {MemberArtworkContext,type MemberArtworkRenderer} from '../MemberArtworkContext';
import ImagePortraitStage from './ImagePortraitStage';
import MelonEatingStage from './MelonEatingStage';
import JudefanPortraitStage from './JudefanPortraitStage';
import type {JudefanAction} from './judefan-motion';
import type {PortraitAction} from './portrait-motion';
import {profileImageSrc} from '../media/image-loader';
import '../styles.css';

// Local-only visual QA: deterministic click action and optional paused keyframe.
const query=new URLSearchParams(location.search);
const action=query.get('action');
const idle=query.get('idle');
const frame=query.has('frame')?Number(query.get('frame')):undefined;
const bounded=(name:string,min:number,max:number)=>{
  const value=query.has(name)?Number(query.get(name)):NaN;
  return Number.isFinite(value)?Math.max(min,Math.min(max,value)):undefined;
};
const idleTimes:Record<string,number>={invite:5.4,peek:15.6,laugh:26};
const review:{action?:PortraitAction;age?:number;idleTime?:number;gaze?:number;zoom?:number}|undefined=import.meta.env.DEV&&idle&&Object.hasOwn(idleTimes,idle)
  ?{idleTime:bounded('time',0,86)??idleTimes[idle],age:0,gaze:bounded('gaze',-1,1),zoom:bounded('zoom',1,3)}
  :import.meta.env.DEV&&(action==='original'||action==='nod'||action==='curious'||action==='wave'||action==='siu')
    ?{action,age:frame!==undefined&&Number.isFinite(frame)?Math.max(0,Math.min(60,frame)):undefined,gaze:bounded('gaze',-1,1),zoom:bounded('zoom',1,3)}:undefined;
const judeAction=query.get('judeAction');
const judeReview=import.meta.env.DEV&&(judeAction==='laugh'||judeAction==='original'||judeAction==='salute')
  ?{action:judeAction as JudefanAction,age:bounded('judeFrame',0,12)??2}:undefined;
const renderArtwork:MemberArtworkRenderer=(member,surface)=>member.id==='lingard'
  ?<ImagePortraitStage key={member.id+'-'+surface} src={profileImageSrc(member.hero)} surface={surface} review={review}/>:member.id==='melon'
    ?<MelonEatingStage key={member.id+'-'+surface} src={profileImageSrc(member.hero)} surface={surface} reviewFrame={import.meta.env.DEV?bounded('melonFrame',0,8):undefined}/>:member.id==='judefan'
      ?<JudefanPortraitStage key={member.id+'-'+surface} src={profileImageSrc(member.hero)} surface={surface} review={judeReview}/>:null;

createRoot(document.getElementById('root')!).render(
  <StrictMode><MemoryRouter initialEntries={['/members']}>
    <MemberArtworkContext.Provider value={renderArtwork}><App/></MemberArtworkContext.Provider>
  </MemoryRouter></StrictMode>,
);
