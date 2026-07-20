const MAX_IMAGE_BYTES=160*1024;
export const MOMENTS_SCHEMA=`CREATE TABLE IF NOT EXISTS moments (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 image TEXT NOT NULL,
 created_at TEXT DEFAULT (datetime('now'))
)`;
class ApiError extends Error{constructor(message,status=400){super(message);this.status=status}}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
export async function ensureMomentsTable(db){if(!db)throw new ApiError('D1 binding DB is not configured',503);await db.prepare(MOMENTS_SCHEMA).run()}
function imageBytes(value){const match=/^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match)return-1;const data=match[1];return Math.floor(data.length*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0)}
export async function readMomentPayload(request){const body=await request.json().catch(()=>null);if(!body||typeof body!=='object')throw new ApiError('请求内容格式不正确');const title=String(body.title||'').trim();const image=String(body.image||'').trim();if(!title)throw new ApiError('请填写小标题');if([...title].length>7)throw new ApiError('小标题不能超过 7 个字');if(!image)throw new ApiError('请选择照片');const bytes=imageBytes(image);if(bytes<0)throw new ApiError('照片必须是 WebP 格式');if(bytes>MAX_IMAGE_BYTES)throw new ApiError('照片不能超过 160KB');return{title,image}}
export function momentId(value){const id=Number(value);if(!Number.isInteger(id)||id<1)throw new ApiError('无效的照片编号');return id}
export function handleError(error){if(error instanceof ApiError)return json({error:error.message},error.status);console.error(error);return json({error:'服务器暂时无法处理请求'},500)}
