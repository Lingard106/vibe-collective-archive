import{ApiError,ensureMemberTables,handleError,json,memberId,readMemberPayload,saveProfile,sessionMember}from'../_members.js';
export async function onRequestPut({request,env,params}){try{await ensureMemberTables(env.DB);const id=memberId(params.id);if(await sessionMember(env.DB,request)!==id)throw new ApiError('编辑权限已过期，请重新验证生日',401);const saved=await saveProfile(env.DB,id,await readMemberPayload(request));return json({profile:saved})}catch(error){return handleError(error)}}

