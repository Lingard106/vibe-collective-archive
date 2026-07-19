export const GUESTS_SCHEMA=`CREATE TABLE IF NOT EXISTS guests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 alias TEXT NOT NULL,
 desc TEXT DEFAULT '',
 avatar TEXT DEFAULT '',
 tags TEXT DEFAULT '',
 quote TEXT DEFAULT '',
 created_at TEXT DEFAULT (datetime('now'))
)`;
const MAX_AVATAR_BYTES=80*1024;
export class ApiError extends Error{constructor(message,status=400){super(message);this.status=status}}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
export async function ensureGuestsTable(db){if(!db)throw new ApiError('D1 binding DB is not configured',503);await db.prepare(GUESTS_SCHEMA).run()}
function text(value,maxLength){return typeof value==='string'?value.trim().slice(0,maxLength):''}
function avatarByteLength(value){const match=/^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match)throw new ApiError('头像必须是 WebP base64 数据');const data=match[1];return Math.floor(data.length*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0)}
export async function readGuestPayload(request){let body;try{body=await request.json()}catch{throw new ApiError('请求内容必须是 JSON')};const alias=text(body?.alias,80);if(!alias)throw new ApiError('请填写嘉宾别名');const avatar=text(body?.avatar,130000);if(avatar&&avatarByteLength(avatar)>MAX_AVATAR_BYTES)throw new ApiError('头像不能超过 80KB');return{alias,desc:text(body?.desc,2000),avatar,tags:text(body?.tags,500),quote:text(body?.quote,500)}}
export function guestId(value){const id=Number.parseInt(String(value),10);if(!Number.isSafeInteger(id)||id<1)throw new ApiError('无效的嘉宾 ID');return id}
export function handleError(error){if(error instanceof ApiError)return json({error:error.message},error.status);console.error(error);return json({error:'服务器暂时无法处理请求'},500)}
