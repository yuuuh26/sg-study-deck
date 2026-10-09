import {APP_ID,FORMAT_VERSION,DEFAULTS,rebuildReviews,uid,validateBackup,validatePack,quickCount,isUnknown} from './core.js';
const STORES=['questionCatalog','attempts','sessions','reviewState','settings','audioTracks','audioBlobs','syncQueue','schemaMeta','safetyCopies'];
const keys={questionCatalog:'questionId',attempts:'attemptId',sessions:'sessionId',reviewState:'questionId',settings:'key',audioTracks:'trackId',audioBlobs:'trackId',syncQueue:'key',schemaMeta:'key',safetyCopies:'id'};
export const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
let connection;
export async function openDB(){
  if(connection)return connection;
  connection=await new Promise((resolve,reject)=>{
    const r=indexedDB.open('yuu-sg-study-deck',1);
    r.onupgradeneeded=()=>{for(const name of STORES){const s=r.result.createObjectStore(name,{keyPath:keys[name]});if(name==='attempts'){s.createIndex('questionId','questionId');s.createIndex('sessionId','sessionId');}}};
    r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('別のタブを閉じて再読み込みしてください'));
  });return connection;
}
export async function transaction(names,mode,fn){
  const db=await openDB(),tx=db.transaction(names,mode),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存を中止しました'));});
  try{const result=await fn(Object.fromEntries(names.map(n=>[n,tx.objectStore(n)])));await done;return result;}catch(e){try{tx.abort();}catch{}await done.catch(()=>{});throw e;}
}
export const all=store=>transaction([store],'readonly',s=>request(s[store].getAll()));
export const get=(store,key)=>transaction([store],'readonly',s=>request(s[store].get(key)));
export const put=(store,value)=>transaction([store],'readwrite',s=>request(s[store].put(value)));
async function bump(stores){const old=await request(stores.syncQueue.get('state'))||{key:'state',revision:0,sentRevision:0,lastSuccess:0};old.revision++;stores.syncQueue.put(old);return old;}
export async function settings(){const value=(await get('settings','preferences'))?.value||{};return {...structuredClone(DEFAULTS),...value,quickCount:quickCount(value.quickCount??DEFAULTS.quickCount),assignments:{...structuredClone(DEFAULTS.assignments),...value.assignments}};}
export async function saveSettings(value){return transaction(['settings','syncQueue'],'readwrite',async s=>{s.settings.put({key:'preferences',value});await bump(s);});}
export async function saveSession(session,dirty=true){return transaction(['sessions','syncQueue'],'readwrite',async s=>{s.sessions.put(session);if(dirty)await bump(s);});}
export async function saveAnswer(attempt,session){
  if(isUnknown(attempt)&&attempt.correct)throw new Error('分からない回答を正解として保存できません');
  return transaction(['attempts','sessions','reviewState','syncQueue','settings'],'readwrite',async s=>{
    const existing=await request(s.attempts.get(attempt.attemptId));if(existing)return existing;
    const prior=await request(s.attempts.index('questionId').getAll(attempt.questionId));
    const a={...attempt,firstAttempt:prior.length===0};s.attempts.add(a);
    const pins=(await request(s.settings.get('pins')))?.value||{};s.reviewState.put(rebuildReviews([...prior,a],pins)[a.questionId]);
    s.sessions.put(session);await bump(s);return a;
  });
}
export async function importPack(pack){
  return transaction(['questionCatalog'],'readwrite',async s=>{
    const existing=await request(s.questionCatalog.getAll());const questions=validatePack(pack,existing);
    for(const q of questions)s.questionCatalog.put(q);return questions.length;
  });
}
export async function pins(){return (await get('settings','pins'))?.value||{};}
export async function pin(id,yes){return transaction(['settings','syncQueue'],'readwrite',async s=>{const value=(await request(s.settings.get('pins')))?.value||{};value[id]=yes;s.settings.put({key:'pins',value});await bump(s);});}
export async function snapshot(){
  return transaction(['attempts','sessions','settings','audioTracks','syncQueue'],'readonly',async s=>{
    const [attempts,sessions,settingsRows,audioTracks,sync]=await Promise.all([request(s.attempts.getAll()),request(s.sessions.getAll()),request(s.settings.getAll()),request(s.audioTracks.getAll()),request(s.syncQueue.get('state'))]);
    return {appId:APP_ID,formatVersion:FORMAT_VERSION,exportedAt:new Date().toISOString(),counts:{attempts:attempts.length,sessions:sessions.length},attempts,sessions,settings:settingsRows.find(x=>x.key==='preferences')?.value||structuredClone(DEFAULTS),pins:settingsRows.find(x=>x.key==='pins')?.value||{},audioTracks,revision:sync?.revision||0};
  });
}
export async function restore(raw,expectedRevision){
  const data=validateBackup(raw);
  return transaction(['attempts','sessions','settings','reviewState','audioTracks','syncQueue','safetyCopies'],'readwrite',async s=>{
    const sync=await request(s.syncQueue.get('state'))||{key:'state',revision:0,sentRevision:0,lastSuccess:0};
    if(expectedRevision!==undefined&&sync.revision!==expectedRevision)throw new Error('確認中に端末の記録が変更されました。復元内容をもう一度確認してください');
    const previous={appId:APP_ID,formatVersion:FORMAT_VERSION,exportedAt:new Date().toISOString(),attempts:await request(s.attempts.getAll()),sessions:await request(s.sessions.getAll()),settings:(await request(s.settings.get('preferences')))?.value||structuredClone(DEFAULTS),pins:(await request(s.settings.get('pins')))?.value||{},audioTracks:await request(s.audioTracks.getAll())};
    s.safetyCopies.add({id:uid(),createdAt:previous.exportedAt,data:previous});
    s.attempts.clear();s.sessions.clear();s.reviewState.clear();
    for(const a of data.attempts)s.attempts.add(a);
    for(const session of data.sessions)s.sessions.put({...session,status:session.status==='active'?'interrupted':session.status});
    for(const r of Object.values(rebuildReviews(data.attempts,data.pins)))s.reviewState.put(r);
    s.settings.put({key:'preferences',value:data.settings});s.settings.put({key:'pins',value:data.pins||{}});
    for(const t of data.audioTracks||[])s.audioTracks.put(t);
    sync.revision++;delete sync.pending;sync.cloudGuard=true;s.syncQueue.put(sync);return {previousCount:previous.attempts.length,count:data.attempts.length};
  });
}
export async function addTrack(meta,blob){return transaction(['audioTracks','audioBlobs','syncQueue'],'readwrite',async s=>{s.audioTracks.put(meta);s.audioBlobs.put({trackId:meta.trackId,blob});await bump(s);});}
export async function editTrack(meta){return transaction(['audioTracks','syncQueue'],'readwrite',async s=>{s.audioTracks.put(meta);await bump(s);});}
export async function deleteTrack(id){return transaction(['audioTracks','audioBlobs','settings','syncQueue'],'readwrite',async s=>{s.audioTracks.delete(id);s.audioBlobs.delete(id);const row=await request(s.settings.get('preferences'));if(row){if(row.value.trackId===id)row.value.trackId=null;for(const t of ['neon','boss','cyber'])row.value.assignments[t]=row.value.assignments[t].filter(x=>x!==id);s.settings.put(row);}await bump(s);});}
export async function syncState(){return (await get('syncQueue','state'))||{key:'state',revision:0,sentRevision:0,lastSuccess:0};}
export async function updateSync(fn){return transaction(['syncQueue'],'readwrite',async s=>{const old=await request(s.syncQueue.get('state'))||{key:'state',revision:0,sentRevision:0,lastSuccess:0};const next=fn(old);s.syncQueue.put(next);return next;});}
