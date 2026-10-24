import {useEffect, useLayoutEffect, useRef, useState, type PointerEvent} from 'react';
import {Pencil} from 'lucide-react';
import {advanceOffset, frameAt, visibleSlots} from './film-layout';
import {useMediaPreference, usePageVisible} from '../media/useMediaPreference';

export type FilmPhoto = {id?: number; title: string; image: string};
type Props = {photos: FilmPhoto[]; row: number; paused: boolean; editable: boolean; onView: (index: number) => void; onEdit: (photo: FilmPhoto) => void};
export default function FilmReel({photos, row, paused, editable, onView, onEdit}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const slot = useRef(0);
  const measuredStep = useRef(332);
  const drag = useRef<{id: number; x: number; y: number; offset: number; moved: boolean} | null>(null);
  const dragged = useRef(false);
  const [layout, setLayout] = useState({width: 1440, card: 320});
  const [windowOffset, setWindowOffset] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(true);
  const reduced = useMediaPreference('(prefers-reduced-motion: reduce)');
  const visible = usePageVisible();
  const step = layout.card + 12;
  const frozen = paused || editable || hovered || focused || dragging || reduced || !visible || !inView;
  const update = (next: number) => {
    offset.current = next;
    if (track.current) track.current.style.transform = `translate3d(${-next}px,0,0)`;
    const nextSlot = Math.floor(next / step);
    if (slot.current !== nextSlot) {slot.current = nextSlot; setWindowOffset(next);}
  };
  useLayoutEffect(() => {
    const element = root.current!;
    const measure = () => {
      const card = probe.current!.getBoundingClientRect().width;
      offset.current = offset.current / measuredStep.current * (card + 12);
      measuredStep.current = card + 12;
      slot.current = Math.floor(offset.current / measuredStep.current);
      setWindowOffset(offset.current);
      setLayout({width: element.clientWidth, card});
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);observer.observe(probe.current!);measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(root.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (frozen || !photos.length) return;
    let frame = 0;let previous = performance.now();
    const tick = (now: number) => {
      update(advanceOffset(offset.current, Math.min(now - previous, 64), [28,24,30][row], row === 1 ? -1 : 1));
      previous = now;frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [frozen, photos.length, row, step]);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('[data-film-edit]')) return;
    dragged.current = false;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, offset: offset.current, moved: false};
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const point = drag.current;
    if (!point || point.id !== event.pointerId) return;
    const dx = event.clientX - point.x;
    if (!point.moved && (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(event.clientY - point.y))) return;
    if (!point.moved) {point.moved = true;setDragging(true);event.currentTarget.setPointerCapture(event.pointerId);}
    dragged.current = true;update(point.offset - dx);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div ref={root} className={`film-reel row-${row + 1} interactive-reel`} role="region" aria-label={`第 ${row + 1} 行胶卷，可拖动或使用方向键浏览`} tabIndex={0}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(false);}}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    onClickCapture={event => {if (dragged.current) {event.preventDefault();event.stopPropagation();dragged.current = false;}}}
    onKeyDown={event => {if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {event.preventDefault();event.currentTarget.focus({preventScroll:true});update(offset.current + (event.key === 'ArrowRight' ? step : -step));}}}>
    <div ref={probe} className="film-size-probe" aria-hidden="true"/>
    <div className="film-window" style={{height: layout.card * 9 / 16}}>
      <div ref={track} className="film-track" style={{transform: `translate3d(${-offset.current}px,0,0)`}}>
        {photos.length > 0 && visibleSlots(windowOffset, layout.width, layout.card, 12).map(position => {
          const index = frameAt(position + row * 2, photos.length)!;
          const photo = photos[index];
          const onScreen = position * step + layout.card > offset.current && position * step < offset.current + layout.width;
          return <figure className="film-card" key={position} aria-hidden={!onScreen} style={{left: position * step, width: layout.card}}>
            <button className="film-open" tabIndex={onScreen?0:-1} aria-label={`查看照片：${photo.title}`} onClick={() => onView(index)}><img src={photo.image} alt={photo.title} loading="lazy" decoding="async" draggable={false}/></button>
            <figcaption>{photo.title}</figcaption>
            {editable && photo.id && <button className="film-edit" tabIndex={onScreen?0:-1} data-film-edit aria-label={`编辑${photo.title}`} onClick={() => onEdit(photo)}><Pencil size={14}/></button>}
          </figure>;
        })}
      </div>
    </div>
  </div>;
}
