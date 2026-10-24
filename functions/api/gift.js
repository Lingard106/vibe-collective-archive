import {CAMPAIGN, schema, json, randomToken, ownerToken, hashToken, ownerCookie, publicState, getClaim, readNickname} from './_gift.js';

export async function onRequestGet({request,env}) {
  try {
    await env.DB.prepare(schema).run();
    const existing=ownerToken(request);
    const token=existing||randomToken();
    const row=await getClaim(env.DB);
    return json(publicState(row,await hashToken(token)),200,existing?undefined:ownerCookie(request,token));
  } catch {return json({error:'礼包暂时无法连接，请稍后重试'},503);}
}
export async function onRequestPost({request,env}) {
  const origin=request.headers.get('Origin');
  if(origin!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'请在网站内领取礼包'},403);
  const token=ownerToken(request);
  if(!token)return json({error:'请允许本站 Cookie，然后重新打开礼包'},400);
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({error:'请求格式错误'},415);
  let nickname;
  try{nickname=await readNickname(request);}catch{return json({error:'请输入 1–24 个字的有效昵称'},400);}
  try {
    await env.DB.prepare(schema).run();
    const owner=await hashToken(token);
    // The unique campaign key is the lock. Never check availability then insert.
    const inserted=await env.DB.prepare('INSERT INTO gift_claims (campaign,owner_hash,nickname,receipt) VALUES (?,?,?,?) ON CONFLICT(campaign) DO NOTHING RETURNING *').bind(CAMPAIGN,owner,nickname,`C106-${randomToken(10).toUpperCase()}`).first();
    const row=inserted||await getClaim(env.DB);
    const result=publicState(row,owner);
    return json(result,result.state==='mine'?(inserted?201:200):409);
  } catch {return json({error:'领取结果暂时未确认，请重试；同一身份不会重复领取'},503);}
}
