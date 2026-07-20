import{mkdirSync}from'node:fs';
import{dirname,resolve}from'node:path';
import{onRequestGet,onRequestPost}from'../functions/api/guests.js';
import{onRequestDelete,onRequestPut}from'../functions/api/guests/[id].js';
import{onRequestGet as getEvents,onRequestPost as postEvent}from'../functions/api/events.js';
import{onRequestDelete as deleteEvent,onRequestPut as putEvent}from'../functions/api/events/[id].js';
import{onRequestGet as getMoments,onRequestPost as postMoment}from'../functions/api/moments.js';
import{onRequestDelete as deleteMoment,onRequestPut as putMoment}from'../functions/api/moments/[id].js';
import{onRequestGet as getHearts,onRequestPut as putHeart}from'../functions/api/hearts.js';
import{onRequestGet as getMessages,onRequestPost as postMessage}from'../functions/api/messages.js';

class LocalD1Statement{
 constructor(database,sql){this.database=database;this.sql=sql;this.values=[]}
 bind(...values){this.values=values;return this}
 async run(){const result=this.database.prepare(this.sql).run(...this.values);return{success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}}
 async all(){return{success:true,results:this.database.prepare(this.sql).all(...this.values)}}
 async first(){return this.database.prepare(this.sql).get(...this.values)??null}
}

class LocalD1{
 constructor(file,DatabaseSync){mkdirSync(dirname(file),{recursive:true});this.database=new DatabaseSync(file)}
 prepare(sql){return new LocalD1Statement(this.database,sql)}
}

function requestHeaders(incoming){const headers=new Headers();for(const[name,value]of Object.entries(incoming)){if(Array.isArray(value)){for(const item of value)headers.append(name,item)}else if(value!==undefined)headers.set(name,value)}return headers}
async function requestBody(request){const chunks=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks)}
async function send(response,outgoing){outgoing.statusCode=response.status;response.headers.forEach((value,name)=>outgoing.setHeader(name,value));outgoing.end(Buffer.from(await response.arrayBuffer()))}

export default function localGuestsApi(){
 let db;
 return{name:'vibe-local-guests-api',apply:'serve',async configureServer(server){
  const{DatabaseSync}=await import('node:sqlite');const databaseFile=resolve(server.config.root,'.local-data','guests.sqlite');db??=new LocalD1(databaseFile,DatabaseSync);
  server.middlewares.use(async(incoming,outgoing,next)=>{
   const pathname=new URL(incoming.url||'/','http://local').pathname;const heartsMatch=/^\/api\/hearts$/.exec(pathname);const messagesMatch=/^\/api\/messages$/.exec(pathname);const momentMatch=/^\/api\/moments(?:\/(\d+))?$/.exec(pathname);const eventMatch=/^\/api\/events(?:\/(\d+))?$/.exec(pathname);const match=/^\/api\/guests(?:\/(\d+))?$/.exec(pathname);if(!match&&!eventMatch&&!momentMatch&&!heartsMatch&&!messagesMatch)return next();
   const method=(incoming.method||'GET').toUpperCase();const handler=heartsMatch?(method==='GET'?getHearts:method==='PUT'?putHeart:null):messagesMatch?(method==='GET'?getMessages:method==='POST'?postMessage:null):momentMatch?(method==='GET'&&!momentMatch[1]?getMoments:method==='POST'&&!momentMatch[1]?postMoment:method==='PUT'&&momentMatch[1]?putMoment:method==='DELETE'&&momentMatch[1]?deleteMoment:null):eventMatch?(method==='GET'&&!eventMatch[1]?getEvents:method==='POST'&&!eventMatch[1]?postEvent:method==='PUT'&&eventMatch[1]?putEvent:method==='DELETE'&&eventMatch[1]?deleteEvent:null):(method==='GET'&&!match[1]?onRequestGet:method==='POST'&&!match[1]?onRequestPost:method==='PUT'&&match[1]?onRequestPut:method==='DELETE'&&match[1]?onRequestDelete:null);
   if(!handler){outgoing.statusCode=405;outgoing.setHeader('Content-Type','application/json; charset=utf-8');outgoing.end(JSON.stringify({error:'Method not allowed'}));return}
   const body=method==='GET'||method==='HEAD'?undefined:await requestBody(incoming);const request=new Request(`http://local${incoming.url||pathname}`,{method,headers:requestHeaders(incoming.headers),body:body?.length?body:undefined});
   try{const response=await handler({request,env:{DB:db},params:{id:(momentMatch||eventMatch||match||[])[1]}});await send(response,outgoing)}catch(error){server.config.logger.error(error instanceof Error?error.stack||error.message:String(error));outgoing.statusCode=500;outgoing.setHeader('Content-Type','application/json; charset=utf-8');outgoing.end(JSON.stringify({error:'Local API failed'}))}
  })
 }}
}
