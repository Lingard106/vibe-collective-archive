import {ACTION_DURATION,choosePortraitAction,type PortraitAction} from './portrait-motion';

// Uses the renderer's paused animation clock: background tabs never consume clicks.
export function createPortraitActionQueue(select:()=>PortraitAction=choosePortraitAction){
  const pending:PortraitAction[]=[];
  let action:PortraitAction='nod',start=-100,active=false,nextAt=0,accepted=0,started=0;
  function sample(now:number){
    while(true){
      if(active&&now>=start+ACTION_DURATION[action]){
        active=false;nextAt=start+ACTION_DURATION[action]+.12;
      }
      if(active||!pending.length||now<nextAt)break;
      action=pending.shift()!;start=nextAt;active=true;started++;
    }
    return {action,age:active?now-start:100,active,pending:pending.length,accepted,started};
  }
  return{
    sample,
    enqueue(now:number,forced?:PortraitAction){
      sample(now);
      if(!active&&!pending.length)nextAt=Math.max(now,nextAt);
      pending.push(forced??select());accepted++;
      return sample(now);
    },
  };
}
