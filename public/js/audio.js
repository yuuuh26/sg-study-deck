import * as db from './db.js';
import {uid} from './core.js';
const MIME={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm',flac:'audio/flac'};
export async function importAudio(file,order=0){
  const type=file.type||MIME[file.name.split('.').at(-1).toLowerCase()];
  if(!type||!new Audio().canPlayType(type))throw new Error('このブラウザで再生できない形式です');
  if(file.size<=0||file.size>100*1024*1024)throw new Error('音源は0バイト超・100MB以下にしてください');
  const estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-estimate.usage<file.size*1.15)throw new Error('端末の空き容量が不足しています');
  const url=URL.createObjectURL(file),probe=new Audio();probe.preload='metadata';
  let duration;
  try{duration=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('音源の確認がタイムアウトしました')),12000);probe.onloadedmetadata=()=>{clearTimeout(timer);Number.isFinite(probe.duration)&&probe.duration>0?resolve(probe.duration):reject(new Error('音源の長さを確認できません'));};probe.onerror=()=>{clearTimeout(timer);reject(new Error('音源が破損しているか、この形式を再生できません'));};probe.src=url;});}
  finally{probe.removeAttribute('src');probe.load();URL.revokeObjectURL(url);}
  const meta={trackId:uid(),name:file.name.replace(/\.[^.]+$/,''),originalName:file.name,format:type,size:file.size,duration,addedAt:new Date().toISOString(),favorite:false,order,verified:true};
  await db.addTrack(meta,new Blob([file],{type}));return meta;
}
export class AudioEngine{
  constructor(settings,onState=()=>{}){this.settings=settings;this.onState=onState;this.channels=[];this.current=0;this.epoch=0;this.wantPlay=false;this.pauseTimer=null;this.audit=[];this.transitioning=false;this.selectionEpoch=0;this.selectionChain=Promise.resolve();}
  async unlock(){
    if(!this.context){
      this.context=new (window.AudioContext||window.webkitAudioContext)();const c=this.context;
      this.master=c.createGain();this.bgm=c.createGain();this.sfx=c.createGain();this.duckGain=c.createGain();const limiter=c.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=3;limiter.ratio.value=12;
      this.bgm.connect(this.duckGain);this.duckGain.connect(this.master);this.sfx.connect(this.master);this.master.connect(limiter);limiter.connect(c.destination);
      this.channels=[0,1].map(i=>{const audio=new Audio();audio.preload='auto';audio.crossOrigin='anonymous';const source=c.createMediaElementSource(audio),gain=c.createGain();gain.gain.value=0;source.connect(gain);gain.connect(this.bgm);audio.addEventListener('timeupdate',()=>this.tick(i));audio.addEventListener('ended',()=>{if(this.wantPlay&&i===this.current&&!this.transitioning)this.next().catch(e=>this.report(e.message));});audio.addEventListener('error',()=>this.report('音源を再生できません。再追加を試してください'));return {audio,gain,url:null,trackId:null};});
      this.applySettings(this.settings);this.duckGain.gain.value=1;
    }
    if(this.context.state!=='running')await this.context.resume();
  }
  ramp(param,to,seconds){const now=this.context.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}param.linearRampToValueAtTime(to,now+seconds);}
  applySettings(s){this.settings=s;if(!this.context)return;this.ramp(this.master.gain,s.mute?0:s.master,.03);this.ramp(this.bgm.gain,s.bgm,.05);this.ramp(this.sfx.gain,s.sound?s.sfx:0,.03);}
  report(message=''){this.onState({message,playing:this.wantPlay,trackId:this.channels[this.current]?.trackId});}
  async playlist(){const tracks=(await db.all('audioTracks')).sort((a,b)=>a.order-b.order);const assigned=this.settings.assignments[this.settings.theme]||[];return assigned.length?assigned.map(id=>tracks.find(t=>t.trackId===id)).filter(Boolean):tracks;}
  async start(){this.selectionEpoch++;await this.unlock();clearTimeout(this.pauseTimer);this.wantPlay=true;const ch=this.channels[this.current];
    if(ch.trackId){this.epoch++;this.transitioning=false;this.ramp(this.channels[1-this.current].gain.gain,0,.1);await ch.audio.play();this.ramp(ch.gain.gain,1,.7);this.report();return;}
    const list=await this.playlist();const id=this.settings.trackId||list[0]?.trackId;if(id)await this.select(id);else{this.wantPlay=false;this.report('BGM未登録・音楽なしで利用できます');}
  }
  select(trackId,seconds=1.0,startAt=0){
    const selection=++this.selectionEpoch;const run=()=>selection===this.selectionEpoch?this._select(trackId,seconds,startAt):undefined;
    this.selectionChain=this.selectionChain.catch(()=>{}).then(run);return this.selectionChain;
  }
  async _select(trackId,seconds=1.0,startAt=0){
    await this.unlock();clearTimeout(this.pauseTimer);const epoch=++this.epoch;this.wantPlay=true;this.transitioning=true;
    const old=this.channels[this.current],index=1-this.current,next=this.channels[index];
    this.ramp(next.gain.gain,0,.03);next.audio.pause();if(next.url){URL.revokeObjectURL(next.url);next.url=null;}
    const stored=await db.get('audioBlobs',trackId);if(epoch!==this.epoch)return;
    if(!stored?.blob){this.transitioning=false;this.wantPlay=!!old.trackId&&!old.audio.paused;this.report('音源の再追加が必要です');return;}
    next.url=URL.createObjectURL(stored.blob);next.audio.src=next.url;next.trackId=trackId;next.audio.currentTime=startAt;
    try{await next.audio.play();}catch(e){this.wantPlay=false;this.transitioning=false;this.report('再生ボタンを押して音楽を開始してください');throw e;}
    if(epoch!==this.epoch)return;
    next.gain.gain.cancelScheduledValues(this.context.currentTime);next.gain.gain.setValueAtTime(0,this.context.currentTime);this.ramp(old.gain.gain,0,seconds);this.ramp(next.gain.gain,1,seconds);this.current=index;
    this.audit.push({type:'crossfade',seconds,trackId,time:this.context.currentTime});
    this.report();await new Promise(resolve=>setTimeout(resolve,seconds*1000+50));if(epoch===this.epoch){old.audio.pause();this.transitioning=false;}
  }
  async next(direction=1){const list=await this.playlist();if(!list.length)return;let i=list.findIndex(x=>x.trackId===this.channels[this.current]?.trackId);if(this.settings.repeat==='shuffle'&&list.length>1){const others=list.filter(x=>x.trackId!==list[i]?.trackId);return this.select(others[Math.floor(Math.random()*others.length)].trackId);}return this.select(list[(i+direction+list.length)%list.length].trackId);}
  tick(index){const ch=this.channels[index];if(index===this.current&&this.wantPlay&&!this.transitioning&&Number.isFinite(ch.audio.duration)&&ch.audio.duration>2&&ch.audio.duration-ch.audio.currentTime<=1.1){if(this.settings.repeat==='one')this.select(ch.trackId,1).catch(e=>this.report(e.message));else this.next().catch(e=>this.report(e.message));}}
  pause(seconds=.8){this.selectionEpoch++;if(!this.context)return;const epoch=++this.epoch;clearTimeout(this.pauseTimer);this.wantPlay=false;this.transitioning=false;for(const ch of this.channels)this.ramp(ch.gain.gain,0,seconds);this.audit.push({type:'fadeout',seconds,time:this.context.currentTime});this.pauseTimer=setTimeout(()=>{if(epoch!==this.epoch)return;for(const ch of this.channels)ch.audio.pause();this.report();},seconds*1000+40);this.report();}
  end(){this.pause(this.settings.fade);}
  seek(fraction){const a=this.channels[this.current]?.audio;if(a&&Number.isFinite(a.duration))a.currentTime=a.duration*Math.max(0,Math.min(1,fraction));}
  async themeChanged(){if(!this.settings.themeMusic)return;const ids=this.settings.assignments[this.settings.theme]||[];if(ids.length&&this.wantPlay&&ids[0]!==this.channels[this.current]?.trackId)await this.select(ids[0]);}
  async effect(correct,combo=0){
    if(!this.settings.sound||this.settings.mute)return;try{await this.unlock();}catch{return;}
    const c=this.context,now=c.currentTime;
    if(this.settings.duck){this.ramp(this.duckGain.gain,.65,.04);this.duckGain.gain.setValueAtTime(.65,now+.15);this.duckGain.gain.linearRampToValueAtTime(1,now+.55);}
    const notes=correct?combo>=5?[523.25,659.25,783.99,1046.5]:[659.25,987.77]:[220,164.81];
    notes.forEach((freq,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=correct?'sine':'triangle';o.frequency.value=freq;g.gain.setValueAtTime(0,now+i*.055);g.gain.linearRampToValueAtTime(.12,now+i*.055+.01);g.gain.exponentialRampToValueAtTime(.001,now+i*.055+.2);o.connect(g);g.connect(this.sfx);o.start(now+i*.055);o.stop(now+i*.055+.22);o.onended=()=>{o.disconnect();g.disconnect();};});
  }
}
