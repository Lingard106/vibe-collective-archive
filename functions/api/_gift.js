export const CAMPAIGN = 'milk-tea-2026-10';
export const COOKIE = 'c106_gift_owner';
export const schema = `CREATE TABLE IF NOT EXISTS gift_claims (
 campaign TEXT PRIMARY KEY,
 owner_hash TEXT NOT NULL,
 nickname TEXT NOT NULL,
 receipt TEXT NOT NULL,
 claimed_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;
export function json(data, status = 200, cookie) {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(JSON.stringify(data), {status, headers});
}
export function randomToken(bytes = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2,'0')).join('');
}
export function ownerToken(request) {
  const value = request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
export async function hashToken(token) {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), value=>value.toString(16).padStart(2,'0')).join('');
}
export function ownerCookie(request, token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function publicState(row, ownerHash) {
  if (!row) return {state:'available'};
  if (row.owner_hash !== ownerHash) return {state:'claimed'};
  return {state:'mine', nickname:row.nickname, receipt:row.receipt, claimed_at:row.claimed_at};
}
export async function getClaim(db) {return db.prepare('SELECT * FROM gift_claims WHERE campaign=?').bind(CAMPAIGN).first();}
export async function readNickname(request) {
  const reader=request.body?.getReader();
  if(!reader) throw new Error('请输入昵称');
  let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Error('请求内容过长')}chunks.push(value);}
  const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
  const body=JSON.parse(new TextDecoder().decode(all));
  if(typeof body?.nickname!=='string')throw new Error('请输入昵称');
  const nickname=body.nickname.trim();
  if(!nickname||[...nickname].length>24||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(nickname))throw new Error('昵称需为 1–24 个字，不能包含控制字符');
  return nickname;
}
