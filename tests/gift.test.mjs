import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as get,onRequestPost as post} from '../functions/api/gift.js';
import {onRequestGet as adminGet} from '../functions/api/admin/gift.js';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 const env={DB:{prepare(sql){let args=[];return{bind(...values){args=values;return this},async run(){const result=sqlite.prepare(sql).run(...args);return{meta:{changes:result.changes}}},async first(){return sqlite.prepare(sql).get(...args)||null}}}},ADMIN_MASTER_KEY:'test-only-not-a-real-key'};
 const request=(cookie,body,origin='https://test.example')=>new Request('https://test.example/api/gift',{method:body===undefined?'GET':'POST',headers:{Cookie:cookie||'',Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 return {env,request,close:()=>sqlite.close(),async visitor(){const response=await get({env,request:request()});assert.equal((await response.json()).state,'available');return response.headers.get('set-cookie').split(';')[0]}};
}
test('concurrent visitors produce exactly one winner and GET never consumes',async()=>{
 const f=fixture();try{const cookies=await Promise.all(Array.from({length:20},()=>f.visitor()));const results=await Promise.all(cookies.map((cookie,i)=>post({env:f.env,request:f.request(cookie,{nickname:`访客${i}`})})));assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===409).length,19);
 const winner=results.findIndex(r=>r.status===201);const receipt=await results[winner].json();assert.ok(receipt.receipt);
 const again=await post({env:f.env,request:f.request(cookies[winner],{nickname:'再次提交'})});assert.equal(again.status,200);assert.equal((await again.json()).receipt,receipt.receipt);
 const refresh=await get({env:f.env,request:f.request(cookies[winner])});assert.equal((await refresh.json()).receipt,receipt.receipt);
 const outsider=await get({env:f.env,request:f.request(cookies[(winner+1)%20])});assert.deepEqual(await outsider.json(),{state:'claimed'});
 }finally{f.close()}
});
test('same owner racing receives the same receipt',async()=>{const f=fixture();try{const cookie=await f.visitor();const results=await Promise.all(Array.from({length:10},()=>post({env:f.env,request:f.request(cookie,{nickname:'同一个人'})})));const bodies=await Promise.all(results.map(r=>r.json()));assert.equal(new Set(bodies.map(b=>b.receipt)).size,1);assert.ok(bodies.every(b=>b.state==='mine'));}finally{f.close()}});
test('rejects invalid origin, missing cookie, invalid nickname and large bodies',async()=>{const f=fixture();try{const cookie=await f.visitor();for(const [identity,body,origin]of[[cookie,{nickname:'x'},'https://evil.test'],['',{nickname:'x'},'https://test.example'],[cookie,{nickname:'a'.repeat(25)},'https://test.example'],[cookie,{nickname:'x\n'},'https://evil.test'],[cookie,{nickname:'a'.repeat(3000)},'https://test.example']]){const response=await post({env:f.env,request:f.request(identity,body,origin)});assert.ok(response.status>=400)}assert.equal((await (await get({env:f.env,request:f.request(cookie)})).json()).state,'available');}finally{f.close()}});
test('cookie is private, secure and reused; administrator endpoint is protected',async()=>{const f=fixture();try{const response=await get({env:f.env,request:f.request()});const setCookie=response.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Lax/);const next=await get({env:f.env,request:f.request(setCookie.split(';')[0])});assert.equal(next.headers.get('set-cookie'),null);assert.match(next.headers.get('Cache-Control'),/no-store/);assert.equal((await adminGet({env:f.env,request:f.request()})).status,401);}finally{f.close()}});

test('administrator can verify the winner without receiving identity hashes',async()=>{const f=fixture();try{const cookie=await f.visitor();const won=await(await post({env:f.env,request:f.request(cookie,{nickname:'测试领奖人'})})).json();const request=new Request('https://test.example/api/admin/gift',{headers:{'X-Admin-Key':f.env.ADMIN_MASTER_KEY}});const response=await adminGet({env:f.env,request});assert.equal(response.status,200);const {claim}=await response.json();assert.deepEqual(Object.keys(claim).sort(),['claimed_at','nickname','receipt']);assert.equal(claim.nickname,'测试领奖人');assert.equal(claim.receipt,won.receipt);}finally{f.close()}});

test('malformed JSON, control characters and wrong content type cannot consume the reward',async()=>{const f=fixture();try{const cookie=await f.visitor();for(const [body,mime,status]of[['{','application/json',400],[JSON.stringify({nickname:'x\u202ey'}),'application/json',400],[JSON.stringify({nickname:'x'}),'text/plain',415]]){const request=new Request('https://test.example/api/gift',{method:'POST',headers:{Origin:'https://test.example',Cookie:cookie,'Content-Type':mime},body});assert.equal((await post({env:f.env,request})).status,status);}assert.equal((await(await get({env:f.env,request:f.request(cookie)})).json()).state,'available');}finally{f.close()}});
