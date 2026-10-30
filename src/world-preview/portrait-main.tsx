import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import App from '../App';
import {MemberArtworkContext,type MemberArtworkRenderer} from '../MemberArtworkContext';
import ImagePortraitStage from './ImagePortraitStage';
import type {PortraitAction} from './portrait-motion';
import {profileImageSrc} from '../media/image-loader';
import '../styles.css';

// Local-only visual QA: deterministic click action and optional paused keyframe.
const query=new URLSearchParams(location.search);
const action=query.get('action');
const frame=query.has('frame')?Number(query.get('frame')):undefined;
const bounded=(name:string,min:number,max:number)=>{
  const value=query.has(name)?Number(query.get(name)):NaN;
  return Number.isFinite(value)?Math.max(min,Math.min(max,value)):undefined;
};
const review:{action:PortraitAction;age?:number;gaze?:number;zoom?:number}|undefined=import.meta.env.DEV&&(action==='original'||action==='nod'||action==='curious'||action==='wave'||action==='siu')
  ?{action,age:frame!==undefined&&Number.isFinite(frame)?Math.max(0,Math.min(60,frame)):undefined,gaze:bounded('gaze',-1,1),zoom:bounded('zoom',1,3)}:undefined;
const renderArtwork:MemberArtworkRenderer=(member,surface)=>member.id==='lingard'
  ?<ImagePortraitStage key={member.id+'-'+surface} src={profileImageSrc(member.hero)} surface={surface} review={review}/>:null;

createRoot(document.getElementById('root')!).render(
  <StrictMode><MemoryRouter initialEntries={['/members']}>
    <MemberArtworkContext.Provider value={renderArtwork}><App/></MemberArtworkContext.Provider>
  </MemoryRouter></StrictMode>,
);
