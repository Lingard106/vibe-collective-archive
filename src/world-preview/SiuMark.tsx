const letters=[
  ['11111','10000','10000','11111','00001','00001','11111'],
  ['11111','00100','00100','00100','00100','00100','11111'],
  ['10001','10001','10001','10001','10001','10001','01110'],
  ['10001','10001','10001','10001','10001','10001','01110'],
  ['00100','00100','00100','00100','00100','00000','00100'],
];
const pixels=letters.flatMap((glyph,letter)=>glyph.flatMap((row,y)=>[...row].flatMap((pixel,x)=>pixel==='1'?[[12+letter*24+x*4,12+y*4]]:[])));

// Vector pixels stay sharp without downloading another font or raster texture.
export default function SiuMark(){
  return <svg viewBox="0 0 148 58" aria-hidden="true" shapeRendering="crispEdges">
    <g fill="#251b18" stroke="#251b18" strokeWidth="3" transform="translate(3 4)">{pixels.map(([x,y],i)=><rect key={i} x={x} y={y} width="4" height="4"/>)}</g>
    <g>{pixels.map(([x,y],i)=><rect key={i} x={x} y={y} width="4" height="4" fill={y<24?'#fff2c7':'#e2b45f'}/>)}</g>
    <path d="M19 47H110V50H19Z" fill="#bf642f"/>
    <g fill="#f8d885"><path d="M3 14H7V18H3Z M138 5H142V9H138Z M132 43H136V47H132Z M42 2H45V5H42Z"/></g>
    <path d="M4 29H9V34H4Z M118 49H122V53H118Z" fill="#e26848"/>
  </svg>;
}
