export type JudefanAction='original'|'salute'|'laugh';
export type JudefanClickAction=Exclude<JudefanAction,'laugh'>;
export const JUDEFAN_ACTION_DURATIONS:Readonly<Record<JudefanAction,number>>={original:5.6,salute:6.5,laugh:4.8};
export const JUDEFAN_IDLE_DELAY={min:10,max:19} as const;
export const JUDEFAN_IDLE_SETTLE=.38;
export const JUDEFAN_CLICK_GAP=.14;

const clamp=(value:number)=>Math.max(0,Math.min(1,value));
// The renderer supplies its paused clock. No wall-clock timers or random
// choices are hidden in the pose sampler, so review frames are reproducible.
const ease=(value:number)=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10)};
function envelope(age:number,duration:number,enter:number,leave:number){
  return ease(age/enter)*(1-ease((age-duration+leave)/leave));
}
function neutral(time:number,reduced=false){
  return{original:0,salute:0,laugh:0,chuckle:0,
    breath:reduced?0:Math.sin((Number.isFinite(time)?time:0)*Math.PI*2/5.8)*1.2,
    bodyY:0,bodyRoll:0,headTilt:0,mouthOpen:0,eyesClosed:0,knees:0,
    jumpY:0,airborne:0,landing:0,anticipation:0,phase:'rest'};
}

/** Weights blend the existing character's painted poses, not whole-scene images. */
export function judefanPose(action:JudefanAction|null,age:number,idleTime=0,reduced=false){
  const rest=neutral(idleTime,reduced);
  if(reduced||!action||!Number.isFinite(age)||age<=0||age>=JUDEFAN_ACTION_DURATIONS[action])return rest;
  const duration=JUDEFAN_ACTION_DURATIONS[action];
  const enter=action==='laugh'?.85:action==='original'?1.3:1.2;
  const leave=action==='laugh'?1:1.35;
  const weight=envelope(age,duration,enter,leave);
  const laugh=action==='laugh'?weight:0;
  const original=action==='original'?weight:0;
  // Open the palm while descending, then settle into the stance after contact.
  // The compact smooth arc has zero endpoint velocity: no teleport on takeoff
  // or landing, and the knees absorb the remaining body movement separately.
  const salute=action==='salute'?envelope(age-.9,duration-.9,1.1,leave):0;
  const anticipation=action==='salute'?envelope(age,.55,.3,.15):0;
  const flight=clamp((age-.5)/.95);
  const airborne=action==='salute'?16*flight*flight*(1-flight)*(1-flight):0;
  const landing=action==='salute'?envelope(age-1.45,.65,.16,.35):0;
  const stance=action==='salute'?envelope(age-.6,duration-.6,.75,leave):0;
  const laughter=action==='laugh'?envelope(age,3.8,1.05,.7):0;
  const chuckle=Math.sin((age-1.05)*Math.PI*4.2)*laughter;
  return{...rest,original,salute,laugh,chuckle,
    // A little back-lean / shoulder shake sells the laugh without a cough bow.
    bodyY:-laugh*2.8+chuckle*1.3+salute*2.4,
    bodyRoll:-laugh*2.1+chuckle*.28+salute*.75,
    headTilt:-laugh*2.8+chuckle*.7+salute*.6,
    mouthOpen:laugh*(.84+.16*chuckle*chuckle),
    eyesClosed:laugh*(.9+.1*chuckle*chuckle),
    knees:action==='salute'?stance*.8:0,
    jumpY:airborne>0?-28*airborne:0,airborne,landing,anticipation,
    phase:action==='salute'
      ?age<.5?'anticipate':age<.975?'jump-up':age<1.45?'jump-down':age<2.1?'land':age>duration-leave?'recover':'open-palm'
      :age<enter?'anticipate':age>duration-leave?'recover':action==='laugh'?'belly-laugh':'point',
  };
}
export type JudefanPose=ReturnType<typeof judefanPose>;
export function chooseJudefanAction(random:number):JudefanClickAction{
  return random<.5?'original':'salute';
}

type Active={action:JudefanAction;start:number;mode:'idle'|'click'};
type Settling={start:number;pose:JudefanPose};
export type JudefanMotionSample={
  action:JudefanAction|null;age:number;pose:JudefanPose;
  mode:'rest'|'idle'|'click'|'settling'|'reduced';
  pending:number;accepted:number;started:number;idleStarted:number;nextIdleAt:number;
};
/**
 * One paused-clock controller per visible portrait. Each click is chosen once
 * and queued; idle laughter yields through a brief continuous neutral settle.
 * Reduced motion freezes deadlines and returns a static pose, not auto gestures.
 */
export function createJudefanController(random:()=>number=Math.random){
  const unitRandom=()=>{const value=random();return Number.isFinite(value)?clamp(value):.5};
  const delay=()=>JUDEFAN_IDLE_DELAY.min+(JUDEFAN_IDLE_DELAY.max-JUDEFAN_IDLE_DELAY.min)*unitRandom();
  const queue:JudefanClickAction[]=[];
  let active:Active|null=null,settling:Settling|null=null;
  let accepted=0,started=0,idleStarted=0,lastTime=0,availableAt=0,nextIdleAt=delay(),reduced=false;
  const clock=(time:number)=>Number.isFinite(time)?Math.max(lastTime,time,0):lastTime;
  const advance=(time:number)=>{
    const now=clock(time),dt=now-lastTime;lastTime=now;
    if(reduced){
      if(active)active.start+=dt;
      if(settling)settling.start+=dt;
      availableAt+=dt;nextIdleAt+=dt;return now;
    }
    for(;;){
      if(settling){
        const end=settling.start+JUDEFAN_IDLE_SETTLE;
        if(now<end)break;
        settling=null;availableAt=end;
      }
      if(active){
        const end=active.start+JUDEFAN_ACTION_DURATIONS[active.action];
        if(now<end)break;
        active=null;availableAt=end+JUDEFAN_CLICK_GAP;
        nextIdleAt=end+delay();
      }
      if(queue.length){
        if(now<availableAt)break;
        active={action:queue.shift()!,start:availableAt,mode:'click'};started++;continue;
      }
      if(now>=nextIdleAt){
        // Do not replay minutes of missed autonomous gestures after an external
        // clock jump. The first observed due gesture starts now; clicks still
        // catch up in order through their scheduled durations above.
        active={action:'laugh',start:now,mode:'idle'};idleStarted++;
      }
      break;
    }
    return now;
  };
  const click=(time:number)=>{
    const now=advance(time);
    queue.push(chooseJudefanAction(unitRandom()));accepted++;
    if(active?.mode==='idle'){
      const pose=judefanPose(active.action,now-active.start,now);
      active=null;
      if(pose.laugh>1e-6){settling={start:now,pose};availableAt=now+JUDEFAN_IDLE_SETTLE}
      else availableAt=now;
    }else if(!active&&!settling)availableAt=Math.max(now,availableAt);
    advance(now);
  };
  const sample=(time:number,reduceMotion=false):JudefanMotionSample=>{
    // Enter reduction before advancing, so an initially late sample cannot
    // accidentally start an autonomous gesture. Leaving it accounts for the
    // frozen interval first, then resumes the last pose without an aged jump.
    if(reduceMotion)reduced=true;
    const now=advance(time);reduced=reduceMotion;
    const base={pending:queue.length,accepted,started,idleStarted,nextIdleAt};
    if(reduced)return{...base,action:null,age:0,pose:neutral(now,true),mode:'reduced'};
    if(settling){
      const t=1-ease((now-settling.start)/JUDEFAN_IDLE_SETTLE),pose={...settling.pose,breath:neutral(now).breath,phase:'recover'};
      for(const key of ['original','salute','laugh','chuckle','bodyY','bodyRoll','headTilt','mouthOpen','eyesClosed','knees','jumpY','airborne','landing','anticipation'] as const)pose[key]*=t;
      return{...base,action:'laugh',age:now-settling.start,pose,mode:'settling'};
    }
    if(active)return{...base,action:active.action,age:now-active.start,pose:judefanPose(active.action,now-active.start,now),mode:active.mode};
    return{...base,action:null,age:0,pose:neutral(now),mode:'rest'};
  };
  return{click,sample};
}
