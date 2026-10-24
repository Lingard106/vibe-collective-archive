export function frameAt(slot: number, count: number): number | null {
  return count > 0 ? ((slot % count) + count) % count : null;
}
export function visibleSlots(offset: number, viewportWidth: number, frameWidth: number, gap: number): number[] {
  const step = Math.max(1, frameWidth + gap);
  const first = Math.floor(offset / step) - 2;
  const last = Math.ceil((offset + viewportWidth) / step) + 1;
  return Array.from({length: last - first + 1}, (_, index) => first + index);
}
export function advanceOffset(offset: number, elapsedMs: number, speed: number, direction: -1 | 1): number {
  return offset + Math.max(0, elapsedMs) * speed * direction / 1000;
}
