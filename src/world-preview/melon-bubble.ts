// Scene-registered pixel dots. The speech bubble's original raster border stays.
export const MELON_BUBBLE_DOTS=[{x:500,y:221},{x:524,y:223},{x:548,y:225}] as const;
export const MELON_BUBBLE_PERIOD=1.6;
export function melonBubbleDot(time:number,index:number,reduced=false){
  if(reduced)return{y:0,opacity:1};
  const phase=(Number.isFinite(time)?time:0)/MELON_BUBBLE_PERIOD-index*.18;
  const wave=Math.max(0,Math.cos(phase*Math.PI*2))**2;
  return{y:-3.2*wave,opacity:.36+.64*wave};
}
