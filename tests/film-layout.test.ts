import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceOffset, frameAt, visibleSlots} from '../src/film/film-layout.ts';
test('empty and single-photo reels are safe',()=>{assert.equal(frameAt(1,0),null);assert.equal(frameAt(-9,1),0)});
test('positive and negative slots wrap correctly',()=>{assert.equal(frameAt(-1,5),4);assert.equal(frameAt(6,5),1)});
test('speed is measured in pixels per second, not number of photos',()=>{assert.equal(advanceOffset(10,1000,28,1),38);assert.equal(advanceOffset(10,1000,28,-1),-18)});
test('only visible slots plus four buffer cards are rendered',()=>{
 const slots=visibleSlots(100000,1440,320,12);
 assert.ok(slots.length<=Math.ceil(1440/332)+5);
 const left=slots[0]*332-100000;
 const right=slots.at(-1)!*332+320-100000;
 assert.ok(left<0&&right>1440);
 for(const count of[1,5,100])assert.ok(slots.map(slot=>frameAt(slot,count)).length<11);
});
