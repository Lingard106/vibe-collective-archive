import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';

const code=ts.transpile(readFileSync(resolve('src/birthday/melon-birthday.ts'),'utf8'),{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,
});
const {MELON_BIRTHDAY_START:start,MELON_BIRTHDAY_END:end,isMelonBirthdayAt:active,nextMelonBirthdayBoundary:next}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

assert.equal(start,Date.parse('2026-11-01T16:00:00Z'),'Starts at Beijing midnight, not UTC midnight');
assert.equal(end,Date.parse('2026-11-02T16:00:00Z'),'Ends at the following Beijing midnight');
assert.equal(end-start,24*60*60*1000,'Exactly one day');
assert.equal(active(start-1),false,'Not visible one millisecond early');
assert.equal(active(start),true,'Start is inclusive');
assert.equal(active(start+12*60*60*1000),true,'Visible during the birthday');
assert.equal(active(end-1),true,'Visible through the final millisecond');
assert.equal(active(end),false,'End is exclusive');
assert.equal(active(end+1),false,'Ordinary page returns after the birthday');
assert.equal(active(Date.parse('2027-11-02T12:00:00+08:00')),false,'No unintended annual repeat');

// Visitors' timezone representations refer to identical instants.
for(const instant of ['2026-11-01T16:00:00Z','2026-11-01T08:00:00-08:00','2026-11-02T01:00:00+09:00']){
  assert.equal(Date.parse(instant),start);assert.equal(active(Date.parse(instant)),true);
}
for(const instant of ['2026-11-02T16:00:00Z','2026-11-02T08:00:00-08:00','2026-11-03T01:00:00+09:00']){
  assert.equal(Date.parse(instant),end);assert.equal(active(Date.parse(instant)),false);
}
assert.equal(next(start-1),start,'Open tabs schedule the exact start boundary');
assert.equal(next(start),end,'Active tabs schedule the exact end boundary');
assert.equal(next(end-1),end);
assert.equal(next(end),null,'No event remains after expiry');
for(const value of [NaN,Infinity,-Infinity,undefined,'2026-11-02']){
  assert.equal(active(value),false,'Malformed clocks do not enable a theme');
  assert.equal(next(value),null,'Malformed clocks do not schedule a timer');
}
console.log('PASS: one-off Beijing-time birthday window, inclusive start/exclusive end, 24 hours, timezone equivalence, invalid clocks and next boundary.');
