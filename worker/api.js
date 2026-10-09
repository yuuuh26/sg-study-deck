import {validateBackup,APP_ID} from '../public/js/core.js';
export const COOKIE='__Host-sg-study-deck';
export async function sha(value){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
const random=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
const cookie=(token,age=34560000)=>`${COOKIE}=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}`;
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0;};
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
async function body(request,max=10*1024*1024){if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'JSON形式が必要です');if(Number(request.headers.get('content-length'))>max)fail(413,'送信サイズが上限を超えています');const reader=request.body?.getReader();let size=0,chunks=[];if(!reader)fail(400,'本文が必要です');for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail(413,'送信サイズが上限を超えています');}chunks.push(value);}const buf=new Uint8Array(size);let offset=0;for(const c of chunks){buf.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(buf));}catch{fail(400,'JSONを読み取れません');}}
async function rateLimit(request,env){
  const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'unknown',bucket=await sha(APP_ID+':'+ip+':'+Math.floor(now/300000));
  const result=await env.DB.prepare('INSERT INTO auth_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,now+600000).first();
  if(result.count>8)fail(429,'認証試行が多すぎます。5分ほど待ってください');
  if(Math.random()<.05)await env.DB.prepare('DELETE FROM auth_limits WHERE expires < ?').bind(now).run();
}
async function requireKey(key,request,env){
  await rateLimit(request,env);if(typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))fail(401,'このアプリの復旧キーを確認してください');
  const config=await env.DB.prepare('SELECT key_hash FROM app_config WHERE id=1').first();if(!config?.key_hash)fail(503,'認証設定がありません');
  if(!equal(await sha(APP_ID+':'+key),config.key_hash))fail(401,'復旧キーが一致しません');
}
export async function handleAPI(request,env){
  const url=new URL(request.url),path=url.pathname.slice('/api/'.length);let headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  try{
    if(!env.DB)fail(503,'クラウドの保存先が設定されていません');
    if(request.method!=='GET'&&request.method!=='POST')fail(405,'この操作は対応していません');
    const origin=request.headers.get('Origin');if((request.method==='POST'&&origin!==url.origin)||(origin&&origin!==url.origin))fail(403,'配信元が一致しません');
    if(request.headers.get('Sec-Fetch-Site')==='cross-site')fail(403,'外部サイトからの操作はできません');
    if(path==='login'&&request.method==='POST'){
      const data=await body(request,4096);await requireKey(data.key,request,env);
      const token=random(),id=crypto.randomUUID(),name=typeof data.name==='string'?data.name.slice(0,80):'この端末',now=new Date().toISOString();
      await env.DB.prepare('INSERT INTO devices(id,token_hash,name,created_at,last_seen) VALUES(?,?,?,?,?)').bind(id,await sha(APP_ID+':'+token),name,now,now).run();headers['Set-Cookie']=cookie(token);return json({ok:true,deviceId:id});
    }
    const token=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if(!token||!/^[a-f0-9]{64}$/.test(token))fail(401,'クラウド未接続または認証取消');
    const device=await env.DB.prepare('SELECT * FROM devices WHERE token_hash=? AND revoked=0').bind(await sha(APP_ID+':'+token)).first();if(!device)fail(401,'端末の認証が無効です');
    headers['Set-Cookie']=cookie(token);if(Date.now()-Date.parse(device.last_seen)>3600000)await env.DB.prepare('UPDATE devices SET last_seen=? WHERE id=?').bind(new Date().toISOString(),device.id).run();
    if(path==='status'&&request.method==='GET')return json({ok:true,appId:APP_ID,deviceId:device.id});
    if(path==='logout'&&request.method==='POST'){await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=?').bind(device.id).run();headers['Set-Cookie']=cookie('',0);return json({ok:true});}
    if(path==='backups'&&request.method==='GET'){
      const rows=await env.DB.prepare('SELECT id,created_at AS createdAt,attempts,sessions,checksum FROM backups WHERE verified=1 ORDER BY created_at DESC,id DESC LIMIT 5').all();return json({backups:rows.results});
    }
    if(path==='backups/save'&&request.method==='POST'){
      const data=await body(request);if(typeof data.payload!=='string'||new TextEncoder().encode(data.payload).length>8*1024*1024||typeof data.operationId!=='string'||!/^[a-zA-Z0-9-]{36}$/.test(data.operationId))fail(400,'バックアップ形式が不正です');
      const duplicate=await env.DB.prepare('SELECT id,checksum FROM backups WHERE operation_id=?').bind(data.operationId).first();
      if(duplicate){if(duplicate.checksum!==data.checksum)fail(409,'処理IDが別の内容で使われています');return json({id:duplicate.id});}
      let parsed;try{parsed=validateBackup(JSON.parse(data.payload));}catch(e){fail(400,e.message);}
      const checksum=await sha(data.payload);if(!equal(checksum,data.checksum))fail(400,'チェックサムが一致しません');
      if(parsed.attempts.length===0)fail(400,'空の学習記録ではクラウドを置き換えません');
      const id=crypto.randomUUID(),createdAt=new Date().toISOString();
      const result=await env.DB.prepare('INSERT INTO backups(id,operation_id,created_at,payload,checksum,attempts,sessions,verified,device_id,base_id) SELECT ?,?,?,?,?,?,?,0,?,? WHERE COALESCE((SELECT id FROM backups WHERE verified=1 ORDER BY created_at DESC,id DESC LIMIT 1),\'\')=?').bind(id,data.operationId,createdAt,data.payload,checksum,parsed.attempts.length,parsed.sessions.length,device.id,data.baseId||'',data.baseId||'').run();
      if(!result.meta.changes)fail(409,'他の端末が新しい世代を保存しました。履歴を確認してから再度保存してください');
      const stored=await env.DB.prepare('SELECT payload,checksum FROM backups WHERE id=?').bind(id).first();if(!stored||!equal(await sha(stored.payload),checksum))fail(500,'保存の再取得検証に失敗しました');
      return json({id});
    }
    if(path==='backups/confirm'&&request.method==='POST'){
      const data=await body(request,4096),stored=await env.DB.prepare('SELECT id,payload,checksum,device_id,base_id,verified FROM backups WHERE id=?').bind(data.id).first();
      if(!stored||stored.device_id!==device.id)fail(404,'この端末の保存処理がありません');
      if(!equal(stored.checksum,data.checksum)||!equal(await sha(stored.payload),data.checksum))fail(400,'保存内容が一致しません');
      const result=await env.DB.batch([env.DB.prepare('UPDATE backups SET verified=1 WHERE id=? AND (verified=1 OR base_id=COALESCE((SELECT id FROM backups WHERE verified=1 ORDER BY created_at DESC,id DESC LIMIT 1),\'\'))').bind(stored.id),env.DB.prepare('DELETE FROM backups WHERE verified=1 AND id NOT IN (SELECT id FROM backups WHERE verified=1 ORDER BY created_at DESC,id DESC LIMIT 5)')]);
      if(!result[0].meta.changes)fail(409,'別端末の保存と競合しました。履歴を確認して再保存してください');
      return json({ok:true});
    }
    if(path.startsWith('backups/')&&request.method==='GET'){
      const id=path.slice('backups/'.length);if(!/^[a-zA-Z0-9-]{36}$/.test(id))fail(400,'履歴IDが不正です');
      const row=await env.DB.prepare('SELECT id,payload,checksum,created_at AS createdAt,verified,device_id FROM backups WHERE id=?').bind(id).first();
      if(!row||(!row.verified&&row.device_id!==device.id))fail(404,'履歴がありません');return json({id:row.id,payload:row.payload,checksum:row.checksum,createdAt:row.createdAt});
    }
    if(path==='devices'&&request.method==='GET'){
      const rows=await env.DB.prepare('SELECT id,name,created_at AS createdAt,last_seen AS lastSeen FROM devices WHERE revoked=0 ORDER BY created_at').all();return json({devices:rows.results.map(d=>({...d,current:d.id===device.id}))});
    }
    if(path==='devices/rename'&&request.method==='POST'){
      const data=await body(request,4096);if(typeof data.name!=='string'||!data.name.trim())fail(400,'端末名を入力してください');
      // A regular device may rename only itself. Other devices require the recovery key.
      if(data.id!==device.id)await requireKey(data.key,request,env);
      await env.DB.prepare('UPDATE devices SET name=? WHERE id=? AND revoked=0').bind(data.name.slice(0,80),data.id).run();return json({ok:true});
    }
    if(path==='devices/revoke'&&request.method==='POST'){
      const data=await body(request,4096);await requireKey(data.key,request,env);
      if(data.id==='all')await env.DB.prepare('UPDATE devices SET revoked=1').run();else await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=?').bind(data.id).run();
      if(data.id==='all'||data.id===device.id)headers['Set-Cookie']=cookie('',0);return json({ok:true});
    }
    if(path==='key/rotate'&&request.method==='POST'){
      const data=await body(request,4096);await requireKey(data.key,request,env);if(typeof data.newKey!=='string'||!/^[a-f0-9]{64}$/.test(data.newKey)||equal(data.key,data.newKey))fail(400,'新しい256bitの復旧キーが必要です');
      await env.DB.batch([env.DB.prepare('UPDATE app_config SET key_hash=? WHERE id=1').bind(await sha(APP_ID+':'+data.newKey)),env.DB.prepare('UPDATE devices SET revoked=1')]);headers['Set-Cookie']=cookie('',0);return json({ok:true});
    }
    fail(404,'操作がありません');
  }catch(e){return json({error:e.status?e.message:'クラウド処理に失敗しました。端末の記録は保持されています。'},e.status||500);}
}
