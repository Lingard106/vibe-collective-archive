const MAX_IMAGE_BYTES=220*1024;
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
export async function ensureEventsTable(db){await db.prepare(`CREATE TABLE IF NOT EXISTS timeline_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_date TEXT NOT NULL,
 title TEXT NOT NULL,
 place TEXT DEFAULT '',
 participant_ids TEXT DEFAULT '[]',
 image TEXT DEFAULT '',
 link TEXT DEFAULT '',
 created_at TEXT DEFAULT (datetime('now'))
)`).run();await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS timeline_events_seed_key ON timeline_events(event_date,title)').run();const seeds=[
 ['2021-09-01','故事从这里开始','待补充地点',['lingard','bayern','melon','cech','longteng','leng','eason-gavi','maldini','loong','issac']],
 ['2022-03-01','2022 年共同活动','待补充',['lingard','melon','longteng','eason-gavi']],
 ['2023-11-18','镜头留下的一天','共同记忆',['lingard','bayern','cech','leng','loong']],
 ['2024-06-10','夏日集合','共同记忆',['lingard','bayern','melon','cech','longteng','leng','eason-gavi','maldini','loong','issac']],
 ['2024-09-27','秋日合照','共同记忆',['lingard','melon','longteng','eason-gavi','loong']],
 ['2025-08-01','又一次全员出现','共同记忆',['lingard','bayern','melon','cech','longteng','leng','eason-gavi','maldini','loong','issac']],
 ['2026-07-18','共同图鉴开始制作','线上',['lingard']]
];for(const seed of seeds)await db.prepare('INSERT OR IGNORE INTO timeline_events (event_date,title,place,participant_ids) VALUES (?,?,?,?)').bind(seed[0],seed[1],seed[2],JSON.stringify(seed[3])).run()}
function dataUrlBytes(value){const match=/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(value);if(!match)return-1;return Math.floor(match[1].length*3/4)-(match[1].endsWith('==')?2:match[1].endsWith('=')?1:0)}
export async function readEventPayload(request){const body=await request.json().catch(()=>null);if(!body||typeof body!=='object')throw new Error('请求内容格式不正确');const event_date=String(body.event_date||'').trim();const title=String(body.title||'').trim();const place=String(body.place||'').trim();const image=String(body.image||'').trim();const link=String(body.link||'').trim();const participantIds=Array.isArray(body.participant_ids)?body.participant_ids.map(String).filter(Boolean):[];if(!/^\d{4}-\d{2}-\d{2}$/.test(event_date))throw new Error('请选择有效日期');if(!title)throw new Error('事件标题不能为空');if(title.length>160||place.length>300)throw new Error('标题或地点内容过长');if(image){const bytes=dataUrlBytes(image);if(bytes<0)throw new Error('图片必须是 WebP 格式');if(bytes>MAX_IMAGE_BYTES)throw new Error('图片不能超过 220KB')}if(link&&!/^https?:\/\//i.test(link))throw new Error('图片链接必须以 http:// 或 https:// 开头');return{event_date,title,place,participant_ids:JSON.stringify([...new Set(participantIds)]),image,link}}
export function handleError(error){const message=error instanceof Error?error.message:'服务器处理失败';const status=/不能为空|有效|过长|必须|不能超过|链接/.test(message)?400:500;return json({error:message},status)}
