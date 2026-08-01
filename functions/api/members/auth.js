import{authenticateBirthday,ensureMemberTables,handleError,json,memberId,sessionCookie}from'../_members.js';
export async function onRequestPost({request,env}){try{await ensureMemberTables(env.DB);const body=await request.json().catch(()=>null);const id=memberId(body?.member_id);const token=await authenticateBirthday(env.DB,id,body?.birthday);return json({ok:true,member_id:id},200,{'Set-Cookie':sessionCookie(token)})}catch(error){return handleError(error)}}

