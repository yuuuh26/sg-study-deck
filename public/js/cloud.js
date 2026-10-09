import * as db from './db.js';
import {backupDue,uid,validateBackup} from './core.js';
export async function api(path,body){
  const r=await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok){const e=new Error(data.error||'クラウド通信に失敗しました');e.status=r.status;throw e;}return data;
}
export async function hashText(text){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export class CloudBackup{
  authenticated=false;busy=false;status='クラウド未接続';
  constructor(onStatus=()=>{}){this.onStatus=onStatus;}
  setStatus(s){this.status=s;this.onStatus(s);}
  async check(){try{await api('status');this.authenticated=true;this.setStatus('接続済み');return true;}catch(e){this.authenticated=false;this.setStatus(e.status===401?'クラウド未接続':'通信失敗（端末保存は継続）');return false;}}
  async login(key,name){await api('login',{key,name});this.authenticated=true;const list=await api('backups');const state=await db.syncState();await db.updateSync(s=>({...s,latestId:list.backups[0]?.id||null,cloudGuard:!!list.backups.length,pending:undefined}));this.setStatus(list.backups.length?'既存クラウドあり：復元または保存を選択':'接続済み・保存待ち');return {list,state};}
  async save(manual=false,overwrite=false){
    if(this.busy||!this.authenticated)return false;
    const run=async()=>{
      const state=await db.syncState();if(!manual&&!backupDue(state))return false;
      if(state.revision<=state.sentRevision&&!state.pending){this.setStatus('クラウド保存済み');return false;}
      if(state.cloudGuard&&!overwrite){this.setStatus('既存クラウドを確認してから保存してください');return false;}
      this.busy=true;this.setStatus('クラウド送信中');
      try{
        let pending=state.pending;
        if(!pending){const data=await db.snapshot();if(!data.attempts.length){this.setStatus('学習後にクラウドへ保存できます');return false;}const payload=JSON.stringify(data);pending={operationId:uid(),payload,checksum:await hashText(payload),revision:data.revision,baseId:state.latestId||null};await db.updateSync(s=>({...s,pending}));}
        const result=await api('backups/save',pending);
        const verify=await api('backups/'+result.id);if(verify.checksum!==pending.checksum||await hashText(verify.payload)!==pending.checksum)throw new Error('クラウドの再取得検証に失敗しました');validateBackup(JSON.parse(verify.payload));
        await api('backups/confirm',{id:result.id,checksum:pending.checksum});
        await db.updateSync(s=>({...s,sentRevision:pending.revision,lastSuccess:Date.now(),latestId:result.id,pending:undefined,cloudGuard:false}));this.setStatus('クラウド保存済み');return true;
      }catch(e){if(e.status===401)this.authenticated=false;if(e.status===409)await db.updateSync(s=>({...s,pending:undefined,cloudGuard:true}));this.setStatus(e.message);throw e;}
      finally{this.busy=false;}
    };
    return navigator.locks?navigator.locks.request('sg-cloud-save',run):run();
  }
  async auto(){if(!this.authenticated)return;await this.save().catch(()=>{});}
  async restore(id,revision){const record=await api('backups/'+id);if(await hashText(record.payload)!==record.checksum)throw new Error('バックアップの整合性が不正です');const result=await db.restore(JSON.parse(record.payload),revision);const latest=await api('backups');await db.updateSync(s=>({...s,latestId:latest.backups[0]?.id||null,cloudGuard:true,pending:undefined}));return result;}
}
