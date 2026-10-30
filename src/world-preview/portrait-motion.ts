export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const smooth=(n:number)=>{const t=clamp(n,0,1);return t*t*(3-2*t)};

export type PortraitAction='nod'|'curious'|'original'|'wave'|'siu';
export const ACTION_DURATION:Record<PortraitAction,number>={nod:2.8,curious:3.8,original:10,wave:5.2,siu:6.4};
export const GREETING_MOVE={x:32,y:28,scale:.025};

export function choosePortraitAction(random=Math.random()):PortraitAction{
  return random<.25?'original':random<.55?'wave':random<.8?'siu':random<.9?'nod':'curious';
}

// Smooth ramps have zero velocity at both ends, including periodic idle windows.
function envelope(time:number,start:number,end:number,enter:number,leave:number){
  return smooth((time-start)/enter)*(1-smooth((time-end+leave)/leave));
}
const step=(time:number,start:number,end:number)=>smooth((time-start)/(end-start));
function lift(time:number,start:number,end:number){
  if(time<=start||time>=end)return 0;
  return Math.sin(Math.PI*(time-start)/(end-start))**2;
}

export function blinkAt(time:number){
  const phase=((time%19)+19)%19;
  let value=0;
  for(const start of [3.6,8.7,14.9,15.25]){
    const age=phase-start;
    if(age>=0&&age<.22)value=Math.max(value,age<.065?smooth(age/.065):age<.105?1:1-smooth((age-.105)/.115));
  }
  return value;
}

// Translations use the 1024 x 1536 artwork's pixels; rotations use degrees.
// Feet stay planted during idle; the greeting has two alternating steps each way.
export function portraitPose(time:number,lookX:number,lookY:number,clickAge=100,reduced=false,action:PortraitAction='nod'){
  if(reduced)return{
    yaw:.3,blink:0,breath:0,tilt:0,nod:0,
    hipX:0,bodyRoll:0,leftArm:0,rightArm:0,leftElbow:0,rightElbow:0,
    approach:0,leftStep:0,rightStep:0,leftTravel:0,rightTravel:0,armsOpen:0,
    leftOpen:0,rightOpen:0,torsoOpen:0,leftBend:0,rightBend:0,leftWrist:0,rightWrist:0,
    leftLift:0,rightLift:0,rootY:0,tiptoe:0,legSpread:0,smile:0,crouch:0,rootRoll:0,siuLabel:0,siuImpact:0,phase:'reduced',
  };

  const duration=ACTION_DURATION[action];
  const active=clickAge>=0&&clickAge<duration;
  const isOriginal=active&&action==='original';
  const isWave=active&&action==='wave',isSiu=active&&action==='siu';
  const response=active?envelope(clickAge,0,duration,isOriginal?.8:.48,isOriginal?.9:.85):0;
  const idleWeight=1-response*(isOriginal||isWave||isSiu?1:.85);
  const nodResponse=active&&action==='nod'?response:0;
  const curiousResponse=active&&action==='curious'?response:0;

  // A little burst of enthusiasm and occasional side glances, separated by calm.
  const moodTime=((time%23)+23)%23;
  const enthusiasm=envelope(moodTime,10.2,13.6,.85,1.1);
  const glance=envelope(moodTime,4.6,8.4,1.2,1.4)
    -.7*envelope(moodTime,17.2,20.8,1.3,1.3);
  const littleBounce=enthusiasm*Math.sin((moodTime-10.2)*3.6);
  const ponder=envelope(moodTime,17.6,21.2,1.1,1.2)*idleWeight;

  // One continuous rig action: approach twice, open arms, nod twice, step back.
  // There is deliberately no original-image layer or opacity crossfade.
  const leftTravel=isOriginal?step(clickAge,.15,1.05)-step(clickAge,8.15,9.15):0;
  const rightTravel=isOriginal?step(clickAge,1.05,1.95)-step(clickAge,7.15,8.15):0;
  const approach=(leftTravel+rightTravel)*.5;
  const leftStep=isOriginal?lift(clickAge,.15,1.05)+lift(clickAge,8.15,9.15):0;
  const rightStep=isOriginal?lift(clickAge,1.05,1.95)+lift(clickAge,7.15,8.15):0;
  const armLift=isOriginal?envelope(clickAge,1.8,7.1,1.4,1.5):0;
  const greetingNod=isOriginal?lift(clickAge,3.5,4.15)+lift(clickAge,4.4,5.05):0;
  const wave=isWave?envelope(clickAge,.15,4.7,.85,.9):0;
  const waveBeat=isWave?envelope(clickAge,1,3.9,.35,.45)*Math.sin((clickAge-1)*Math.PI*3.1):0;
  const tiptoe=isWave?envelope(clickAge,.3,4.7,.85,.95)*(.8+.2*Math.cos((clickAge-1.1)*Math.PI*2)):0;
  const spring=isSiu?lift(clickAge,.1,.95):0;
  const flight=isSiu?lift(clickAge,.8,2.15):0;
  const overhead=isSiu?envelope(clickAge,.35,2.25,.7,.65):0;
  const land=isSiu?envelope(clickAge,1.8,5.65,.35,1.2):0;
  const landBounce=isSiu?lift(clickAge,2.1,2.6):0;
  const recoverHop=isSiu?lift(clickAge,4.35,5.7):0;
  const leftOpen=(isWave?wave*.8:isSiu?clamp(overhead*.98+land*.24,0,1):armLift)+ponder*.12;
  const rightOpen=isWave?wave*.12:isSiu?clamp(overhead*.98+land*.24,0,1):armLift;

  return{
    yaw:clamp(.3+(lookX*.35+Math.sin(time*.31)*.055+glance*.07)*idleWeight+curiousResponse*.1-wave*.12+flight*.1,-.22,.72),
    blink:Math.max(blinkAt(time),nodResponse>0&&clickAge<.22?blinkAt(3.6+clickAge):0),
    breath:(-3.6*(1-Math.cos(time*2*Math.PI/5.2))-.4*enthusiasm*littleBounce**2)*idleWeight-3*(leftStep+rightStep),
    tilt:(Math.sin(time*.47)*.65+lookX*.45+glance*1.1+littleBounce*.22)*idleWeight+curiousResponse*1.65+greetingNod*1.5-wave*2.5+waveBeat*.45,
    nod:(lookY*1.6+Math.sin(time*.71)*.4)*idleWeight
      +Math.sin(clickAge*2*Math.PI/1.45)*nodResponse*3.8-curiousResponse*.8+greetingNod*11-armLift*4+waveBeat*1.6-land*3,
    hipX:(Math.sin(time*.47)*11.5+Math.sin(time*.19+1.2)*3.4+littleBounce*1.2)*idleWeight+wave*4,
    bodyRoll:(Math.sin(time*.47-.6)*1.4+Math.sin(time*.83+1)*.4+littleBounce*.15)*idleWeight+(leftStep-rightStep)*.9-wave*1.3,
    leftArm:(Math.sin(time*.71+.6)*4.6+Math.sin(time*1.31)*enthusiasm*1.7)*idleWeight*(1-ponder*.8)
      +nodResponse*1.2-curiousResponse*.8+armLift*90+(rightStep-leftStep)*3,
    rightArm:(Math.sin(time*.63+2.1)*4.6-Math.sin(time*1.47+.5)*enthusiasm*1.7)*idleWeight
      -nodResponse*.9+curiousResponse*.7-armLift*86+(rightStep-leftStep)*3,
    leftElbow:(Math.sin(time*.91+.4)*1.3+Math.sin(time*1.73)*enthusiasm*.5)*idleWeight-armLift*7,
    rightElbow:(Math.sin(time*.78+2.4)*1.25-Math.sin(time*1.57)*enthusiasm*.55)*idleWeight+armLift*7,
    approach,leftStep,rightStep,leftTravel,rightTravel,armsOpen:armLift,
    leftOpen,rightOpen,torsoOpen:isWave?wave*.24:isSiu?overhead*.65+land*.22:armLift,
    leftBend:wave*64+waveBeat*12-ponder*62,rightBend:-wave*5,
    leftWrist:waveBeat*10+ponder*8,rightWrist:0,leftLift:overhead*62,rightLift:-overhead*62,
    rootY:-tiptoe*14-flight*118-recoverHop*24,tiptoe,legSpread:land*76,
    smile:Math.max(wave,land*.8),crouch:spring*35+landBounce*32,rootRoll:waveBeat*.25,
    siuLabel:isSiu?envelope(clickAge,.75,4.35,.22,.65):0,
    siuImpact:isSiu?lift(clickAge,2.1,2.8):0,
    phase:!active?'idle':isOriginal?(clickAge<1.95?'step-forward':clickAge<3.5?'open-arms':clickAge<5.1?'double-nod':clickAge<7.15?'lower-arms':clickAge<9.15?'step-back':'settle')
      :isWave?(clickAge<1?'wave-lift':clickAge<4?'wave-hello':'wave-settle')
      :isSiu?(clickAge<.8?'siu-anticipate':clickAge<2.15?'siu-jump':clickAge<5.2?'siu-land':'siu-settle'):action,
  };
}
export type PortraitPose=ReturnType<typeof portraitPose>;
