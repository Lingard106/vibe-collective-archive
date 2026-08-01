import{adminAuthorized,ApiError,ensureMemberTables,handleError,json,memberId,readMemberPayload,saveProfile}from'../../_members.js';
export async function onRequestPut({request,env,params}){try{if(!await adminAuthorized(request,env))throw new ApiError('管理员凭证无效',401);await ensureMemberTables(env.DB);const saved=await saveProfile(env.DB,memberId(params.id),await readMemberPayload(request));return json({profile:saved})}catch(error){return handleError(error)}}

