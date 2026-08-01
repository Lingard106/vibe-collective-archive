import{ensureMemberTables,handleError,json}from'./_members.js';
export async function onRequestGet({env}){try{await ensureMemberTables(env.DB);const result=await env.DB.prepare('SELECT * FROM member_profiles ORDER BY member_id').all();return json({profiles:result.results||[]})}catch(error){return handleError(error)}}

