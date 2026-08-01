import{clearSessionCookie,deleteSession,ensureMemberTables,handleError,json}from'../_members.js';
export async function onRequestPost({request,env}){try{await ensureMemberTables(env.DB);await deleteSession(env.DB,request);return json({ok:true},200,{'Set-Cookie':clearSessionCookie})}catch(error){return handleError(error)}}

