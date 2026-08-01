const MEMBER_IDS=new Set(['lingard','judefan','melon','cech','longteng','leng','eason-gavi','maldini','loong','issac']);
const PROFILE_SCHEMA=`CREATE TABLE IF NOT EXISTS member_profiles (
 member_id TEXT PRIMARY KEY,
 nickname TEXT NOT NULL DEFAULT '', english_name TEXT NOT NULL DEFAULT '', aliases TEXT NOT NULL DEFAULT '[]',
 avatar TEXT NOT NULL DEFAULT '', quote TEXT NOT NULL DEFAULT '', bed TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '',
 mbti TEXT NOT NULL DEFAULT '', buffs TEXT NOT NULL DEFAULT '[]', debuffs TEXT NOT NULL DEFAULT '[]', stats TEXT NOT NULL DEFAULT '[]',
 updated_at TEXT DEFAULT (datetime('now'))
)`;
const CREDENTIAL_SCHEMA=`CREATE TABLE IF NOT EXISTS member_credentials (
 member_id TEXT PRIMARY KEY, birthday_hash TEXT NOT NULL, salt TEXT NOT NULL,
 failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until TEXT, updated_at TEXT DEFAULT (datetime('now'))
)`;
const SESSION_SCHEMA=`CREATE TABLE IF NOT EXISTS member_sessions (
 token_hash TEXT PRIMARY KEY, member_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
)`;
const MAX_AVATAR_BYTES=100*1024;

export class ApiError extends Error{constructor(message,status=400){super(message);this.status=status}}
export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
export async function ensureMemberTables(db){if(!db)throw new ApiError('D1 数据库未绑定',503);await db.batch([db.prepare(PROFILE_SCHEMA),db.prepare(CREDENTIAL_SCHEMA),db.prepare(SESSION_SCHEMA)]);await db.prepare("DELETE FROM member_sessions WHERE datetime(expires_at)<=datetime('now')").run()}
export function memberId(value){const id=String(value||'').trim();if(!MEMBER_IDS.has(id))throw new ApiError('无效的成员编号',404);return id}
const text=(value,max)=>String(value??'').trim().slice(0,max);
const list=(value,maxItems=20,maxLength=80)=>{const source=Array.isArray(value)?value:String(value||'').split(/[,，]/);return [...new Set(source.map(v=>text(v,maxLength)).filter(Boolean))].slice(0,maxItems)};
function avatarBytes(value){if(!value||/^\/media\/[A-Za-z0-9._-]+$/.test(value))return 0;const match=/^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match)throw new ApiError('头像必须为站内图片或 WebP 图片');const raw=match[1];return Math.floor(raw.length*3/4)-(raw.endsWith('==')?2:raw.endsWith('=')?1:0)}
export async function readMemberPayload(request){const body=await request.json().catch(()=>null);if(!body||typeof body!=='object')throw new ApiError('请求内容格式错误');const stats=(Array.isArray(body.stats)?body.stats:[]).slice(0,12).map((item,index)=>{const name=text(item?.name,30)||`能力 ${index+1}`;const value=Number(item?.value);if(!Number.isFinite(value)||value<0||value>10000)throw new ApiError('雷达数值须在 0 到 10000 之间');return{name,value}});const avatar=text(body.avatar,150000);if(avatarBytes(avatar)>MAX_AVATAR_BYTES)throw new ApiError('头像不能超过 100KB');return{nickname:text(body.nickname,40),english_name:text(body.english_name,50),aliases:JSON.stringify(list(body.aliases)),avatar,quote:text(body.quote,300),bed:text(body.bed,20),region:text(body.region,40),mbti:text(body.mbti,20),buffs:JSON.stringify(list(body.buffs)),debuffs:JSON.stringify(list(body.debuffs)),stats:JSON.stringify(stats)}}
export async function saveProfile(db,id,p){await db.prepare("INSERT INTO member_profiles (member_id,nickname,english_name,aliases,avatar,quote,bed,region,mbti,buffs,debuffs,stats,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(member_id) DO UPDATE SET nickname=excluded.nickname,english_name=excluded.english_name,aliases=excluded.aliases,avatar=excluded.avatar,quote=excluded.quote,bed=excluded.bed,region=excluded.region,mbti=excluded.mbti,buffs=excluded.buffs,debuffs=excluded.debuffs,stats=excluded.stats,updated_at=datetime('now')").bind(id,p.nickname,p.english_name,p.aliases,p.avatar,p.quote,p.bed,p.region,p.mbti,p.buffs,p.debuffs,p.stats).run();return db.prepare('SELECT * FROM member_profiles WHERE member_id=?').bind(id).first()}
const bytesToHex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function digest(value){return bytesToHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function birthdayHash(value,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);return bytesToHex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:120000},key,256))}
function randomToken(size=32){const bytes=crypto.getRandomValues(new Uint8Array(size));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export function normalizeBirthday(value){const birthday=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(birthday)||Number.isNaN(Date.parse(`${birthday}T00:00:00Z`)))throw new ApiError('请输入有效的完整生日');return birthday}
export async function setBirthday(db,id,birthday){const salt=randomToken(18);const hash=await birthdayHash(normalizeBirthday(birthday),salt);await db.prepare("INSERT INTO member_credentials (member_id,birthday_hash,salt,failed_attempts,locked_until,updated_at) VALUES (?,?,?,0,NULL,datetime('now')) ON CONFLICT(member_id) DO UPDATE SET birthday_hash=excluded.birthday_hash,salt=excluded.salt,failed_attempts=0,locked_until=NULL,updated_at=datetime('now')").bind(id,hash,salt).run()}
export async function authenticateBirthday(db,id,birthday){const row=await db.prepare('SELECT * FROM member_credentials WHERE member_id=?').bind(id).first();if(!row)throw new ApiError('该成员尚未设置生日，请联系管理员',403);if(row.locked_until&&Date.parse(`${row.locked_until}Z`)>Date.now())throw new ApiError('尝试次数过多，请稍后再试',429);const actual=await birthdayHash(normalizeBirthday(birthday),row.salt);if(actual!==row.birthday_hash){const attempts=Number(row.failed_attempts||0)+1;const locked=attempts>=5?new Date(Date.now()+15*60*1000).toISOString().slice(0,19).replace('T',' '):null;await db.prepare('UPDATE member_credentials SET failed_attempts=?,locked_until=? WHERE member_id=?').bind(attempts>=5?0:attempts,locked,id).run();throw new ApiError('生日不正确',401)}await db.prepare('UPDATE member_credentials SET failed_attempts=0,locked_until=NULL WHERE member_id=?').bind(id).run();const token=randomToken();const tokenHash=await digest(token);const expires=new Date(Date.now()+30*60*1000).toISOString().slice(0,19).replace('T',' ');await db.prepare('INSERT INTO member_sessions (token_hash,member_id,expires_at) VALUES (?,?,?)').bind(tokenHash,id,expires).run();return token}
function cookieValue(request,name){const cookie=request.headers.get('Cookie')||'';for(const part of cookie.split(';')){const [key,...rest]=part.trim().split('=');if(key===name)return rest.join('=')}return''}
export async function sessionMember(db,request){const token=cookieValue(request,'member_session');if(!token)return null;const row=await db.prepare("SELECT member_id FROM member_sessions WHERE token_hash=? AND datetime(expires_at)>datetime('now')").bind(await digest(token)).first();return row?.member_id||null}
export async function deleteSession(db,request){const token=cookieValue(request,'member_session');if(token)await db.prepare('DELETE FROM member_sessions WHERE token_hash=?').bind(await digest(token)).run()}
export const sessionCookie=token=>`member_session=${token}; Path=/api/members; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`;
export const clearSessionCookie='member_session=; Path=/api/members; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
export async function adminAuthorized(request,env){const expected=String(env.ADMIN_MASTER_KEY||'');const actual=String(request.headers.get('X-Admin-Key')||'');if(!expected||!actual)return false;return(await digest(expected))===(await digest(actual))}
export function handleError(error){if(error instanceof ApiError)return json({error:error.message},error.status);console.error(error);return json({error:'服务器暂时无法处理请求'},500)}

