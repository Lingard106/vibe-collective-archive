import {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';
import type {FilmPhoto} from './FilmReel';

export default function PhotoViewer({photo, count, index, onClose, onMove}: {photo: FilmPhoto; count: number; index: number; onClose: () => void; onMove: (direction: number) => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal();
    return () => {element.close(); if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});};
  }, []);
  return createPortal(<dialog ref={dialog} aria-label={`查看照片：${photo.title}`} className="photo-viewer" onCancel={event => {event.preventDefault();onClose();}}
    onClick={event => {if (event.target === event.currentTarget) onClose();}}
    onKeyDown={event => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();onMove(event.key === 'ArrowLeft' ? -1 : 1);}}}>
    <div className="photo-viewer-inner">
      <header><div><h2>{photo.title}</h2><small>{index + 1} / {count}</small></div><button aria-label="关闭照片" onClick={onClose} autoFocus><X/></button></header>
      <img key={photo.image} src={photo.image} alt={photo.title}/>
      <footer><button aria-label="上一张照片" onClick={() => onMove(-1)}><ChevronLeft/>上一张</button><span>左右切换 · Esc 返回胶卷</span><button aria-label="下一张照片" onClick={() => onMove(1)}>下一张<ChevronRight/></button></footer>
    </div>
  </dialog>, document.body);
}
