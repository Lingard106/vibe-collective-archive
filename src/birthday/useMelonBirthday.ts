import {useEffect,useState} from 'react';
import {isMelonBirthdayAt,nextMelonBirthdayBoundary} from './melon-birthday';

/** Calendar-gated visuals; a tab open across midnight updates without reload. */
export function useMelonBirthday():boolean{
  // Kept separate from BirthdayCue's older ?bday= preview. This override is
  // compiled out of production, so a public URL cannot extend the one-day event.
  const preview=import.meta.env.DEV&&typeof window!=='undefined'
    ?new URLSearchParams(window.location.search).get('melonBirthday'):null;
  const forced=preview==='1'?true:preview==='0'?false:undefined;
  const [active,setActive]=useState(()=>forced??isMelonBirthdayAt(Date.now()));
  useEffect(()=>{
    if(forced!==undefined){setActive(forced);return}
    let timer:number|undefined;
    const refresh=()=>{
      window.clearTimeout(timer);
      const now=Date.now();
      setActive(isMelonBirthdayAt(now));
      const boundary=nextMelonBirthdayBoundary(now);
      if(boundary!==null){
        // Browser timeouts use signed 32-bit delays. Re-arm safely if this
        // source is opened weeks early; only exact boundaries change the theme.
        timer=window.setTimeout(refresh,Math.min(2_147_483_647,Math.max(1,boundary-now)));
      }
    };
    refresh();
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('focus',refresh);
    return()=>{
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange',refresh);
      window.removeEventListener('focus',refresh);
    };
  },[forced]);
  return active;
}
