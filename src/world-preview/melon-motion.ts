// Scene-space pixels in the original 1672 x 940 portrait. The character is
// already seated: only the held melon, forearms, head and shoulders need move.
export const MELON_EAT_DURATION=8;
export const MELON_LIFT={x:-14,y:-106} as const;

const clamp=(value:number)=>Math.max(0,Math.min(1,value));
// Minimum-jerk ramps keep both velocity and acceleration calm at pose changes.
const ease=(value:number)=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10)};
function windowAt(time:number,start:number,end:number,enter:number,leave:number){
  return ease((time-start)/enter)*(1-ease((time-end+leave)/leave));
}
function pulse(time:number,start:number,end:number){
  if(time<=start||time>=end)return 0;
  return Math.sin(Math.PI*(time-start)/(end-start))**2;
}

function neutral(){
  return{lift:0,bite:0,chew:0,headTilt:0,headY:0,torsoY:0,mouthOpen:0,forearmX:0,forearmY:0,phase:'rest'};
}

// Uses the renderer's paused action age. It has no timers, random choices or
// autonomous triggers; every invocation represents the same single eat action.
export function melonEatingPose(age:number,reduced=false){
  if(reduced||!Number.isFinite(age)||age<=0||age>=MELON_EAT_DURATION)return neutral();

  const lift=windowAt(age,.3,7.4,1.3,1.7);
  const bite=pulse(age,1.7,2.3)+pulse(age,3.2,3.8);
  const firstChew=windowAt(age,2.35,3.05,.13,.18)
    *(1-Math.cos((age-2.35)*Math.PI*2/.3))*.5;
  const secondChew=windowAt(age,3.85,5.25,.18,.24)
    *(1-Math.cos((age-3.85)*Math.PI*2/.32))*.5;
  const chew=firstChew+secondChew;
  return{
    lift,bite,chew,
    // Tiny bite nods, not a repeated full-body bow. The head remains rigid.
    headTilt:bite*2.4+chew*.45,
    headY:bite*1.8+chew*.45,
    torsoY:bite+chew*.35,
    mouthOpen:clamp(bite*.9+chew*.22),
    forearmX:MELON_LIFT.x*lift-bite*2,
    forearmY:MELON_LIFT.y*lift-bite*6+chew*1.1,
    phase:age<.3?'rest':age<1.6?'lift':age<3.1?'first-bite':age<5.7?'second-bite':age<7.4?'lower':'rest',
  };
}
export type MelonEatingPose=ReturnType<typeof melonEatingPose>;
