import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {prepareImage} from './image-loader';
import {useMediaPreference} from './useMediaPreference';
import './image-transition.css';

type Props = {src: string; className?: string; alt?: string; style?: CSSProperties};
export default function CrossfadeImage({src, className = '', alt = '', style}: Props) {
  const reduced = useMediaPreference('(prefers-reduced-motion: reduce)');
  const [layers, setLayers] = useState<{current: string; previous?: string}>({current: src});
  const current = useRef(src);
  useEffect(() => {
    let valid = true;
    void prepareImage(src).then(() => {
      if (!valid || current.current === src) return;
      const previous = current.current;
      current.current = src;
      setLayers({current: src, previous: reduced ? undefined : previous});
    }).catch(() => {}); // Selection owners provide retry UI; keep the last image intact.
    return () => {valid = false;};
  }, [src, reduced]);
  useEffect(() => {
    if (!layers.previous) return;
    const timer = setTimeout(() => setLayers(value => ({current: value.current})), reduced ? 0 : 520);
    return () => clearTimeout(timer);
  }, [layers.current, layers.previous, reduced]);
  return <>
    {layers.previous && <img className={`${className} image-crossfade image-crossfade-old`} src={layers.previous} alt="" aria-hidden="true" decoding="async" style={style}/>}
    <img key={layers.current} className={`${className} image-crossfade${layers.previous ? ' image-crossfade-new' : ''}`} src={layers.current} alt={alt} decoding="async" fetchPriority="high" style={style}/>
  </>;
}
