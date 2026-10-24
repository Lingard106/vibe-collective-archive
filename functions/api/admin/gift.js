import {adminAuthorized} from '../_members.js';
import {schema,json,getClaim} from '../_gift.js';
export async function onRequestGet({request,env}) {
  if(!await adminAuthorized(request,env))return json({error:'管理员凭证无效'},401);
  try {
    await env.DB.prepare(schema).run();
    const row=await getClaim(env.DB);
    return json({claim:row?{nickname:row.nickname,receipt:row.receipt,claimed_at:row.claimed_at}:null});
  } catch{return json({error:'暂时无法读取领奖记录'},503);}
}
