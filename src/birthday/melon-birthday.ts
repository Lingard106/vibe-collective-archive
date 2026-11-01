// This is a one-off event, not an annually repeating birthday theme. Explicit
// UTC offsets make every visitor use the same Beijing-time midnight boundaries.
export const MELON_BIRTHDAY_START=Date.parse('2026-11-02T00:00:00+08:00');
export const MELON_BIRTHDAY_END=Date.parse('2026-11-03T00:00:00+08:00');

export function isMelonBirthdayAt(now:number):boolean{
  return Number.isFinite(now)&&now>=MELON_BIRTHDAY_START&&now<MELON_BIRTHDAY_END;
}

/** Next state-changing boundary; null once this single-day event is over. */
export function nextMelonBirthdayBoundary(now:number):number|null{
  if(!Number.isFinite(now)||now>=MELON_BIRTHDAY_END)return null;
  return now<MELON_BIRTHDAY_START?MELON_BIRTHDAY_START:MELON_BIRTHDAY_END;
}
