// UI integration uses a controlled local Japanese TTS provider; audible device quality is a separate Android check.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {createD1} from './d1.mjs';
import {handleAPI} from '../worker/api.js';
import {securityHeaders} from '../worker/index.js';
import {questionSpeech} from '../public/js/speech.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SG_PLAYWRIGHT_PATH||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
const root=resolve('public'),env={DB:createD1()},bank=JSON.parse(readFileSync('public/data/ipa-verified.json'));
const server=createServer(async(req,res)=>{try{
  const origin=`http://127.0.0.1:${server.address().port}`,path=new URL(req.url,origin).pathname;
  if(path.startsWith('/api/')){const response=await handleAPI(new Request(origin+req.url,{headers:req.headers}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/'))throw Error('path');
  res.writeHead(200,{'Content-Type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'}[extname(file)]||'text/plain',...securityHeaders});res.end(readFileSync(file));
}catch{res.writeHead(404).end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;const errors=[];
const pass=label=>console.log('PASS',label);
try{
  browser=await chromium.launch({...(process.env.SG_CHROMIUM_PATH?{executablePath:process.env.SG_CHROMIUM_PATH}:{}),args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
    const qa=window.qaSpeech={records:[],pending:null,cancels:0,voices:[{name:'QA Japanese',lang:'ja-JP',localService:true}],lastCancelled:null};
    class Utterance{constructor(text){this.text=text;}}
    const synth={getVoices:()=>qa.voices,addEventListener(){},removeEventListener(){},speak(u){qa.pending=u;qa.records.push({text:u.text,rate:u.rate,volume:u.volume,lang:u.lang});queueMicrotask(()=>u.onstart?.());},cancel(){qa.cancels++;if(qa.pending)qa.lastCancelled={end:qa.pending.onend,error:qa.pending.onerror};qa.pending=null;}};
    qa.finish=()=>{const u=qa.pending;qa.pending=null;u?.onend?.();};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(origin);await page.waitForSelector('[data-mode="quick"]');await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.evaluate(async()=>{const {AudioEngine}=await import('./js/audio.js');const original=AudioEngine.prototype.setSpeechActive;AudioEngine.prototype.setSpeechActive=function(active){window.qaEngine=this;return original.call(this,active);};});
  const nav=id=>page.locator(`#nav [data-view="${id}"]`).click();
  await nav('settings');await page.waitForSelector('#set-speechRate');await page.locator('#set-speechRate').selectOption('1.3');
  await page.locator('#set-speechVolume').evaluate(el=>{el.value='.8';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#set-master').evaluate(el=>{el.value='.5';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(async()=>{const db=await import('./js/db.js');const s=await db.settings();return s.speechRate===1.3&&s.speechVolume===.8&&s.master===.5;});
  await page.locator('[data-action="speech-test"]').click();assert.equal(await page.evaluate(()=>qaSpeech.records.at(-1).rate),1.3);assert.equal(await page.evaluate(()=>qaSpeech.records.at(-1).volume),.4);
  await page.locator('#set-mute').check();await page.waitForFunction(()=>!qaSpeech.pending);await page.locator('#set-mute').uncheck();pass('speech settings, sample and global mute work');
  const rate=22050,n=rate*30,wav=Buffer.alloc(44+n*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/rate)*1000),44+i*2);
  await page.locator('#audio-input').setInputFiles({name:'speech-bgm.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(async()=>{const db=await import('./js/db.js');return (await db.all('audioTracks')).length===1;});
  await nav('home');await page.locator('[data-mode="quick"]').first().click();await page.waitForSelector('.option');
  const stem=await page.locator('#question-stem').innerText(),q=bank.questions.find(q=>q.stem===stem);assert(q);const from=await page.evaluate(()=>qaSpeech.records.length);
  await page.locator('[data-action="speech-toggle"]').click();await page.waitForFunction(()=>qaEngine.duckGain?.gain.value<.4&&qaEngine.channels[qaEngine.current].audio.currentTime>0);
  for(let i=0;i<questionSpeech(q).length;i++){await page.waitForFunction(()=>!!qaSpeech.pending);await page.evaluate(()=>qaSpeech.finish());}
  assert.deepEqual(await page.evaluate(from=>qaSpeech.records.slice(from).map(x=>x.text),from),questionSpeech(q));await page.waitForFunction(()=>document.querySelector('[data-action="speech-toggle"]').getAttribute('aria-pressed')==='false');
  const at=await page.evaluate(()=>qaEngine.channels[qaEngine.current].audio.currentTime);await page.waitForFunction(at=>qaEngine.channels[qaEngine.current].audio.currentTime>at+.25&&qaEngine.duckGain.gain.value>.99,at);pass('question and all four options read in order; BGM keeps playing and smoothly recovers');
  await page.locator('[data-action="speech-auto"]').click();await page.waitForFunction(()=>document.querySelector('[data-action="speech-toggle"]').getAttribute('aria-pressed')==='true');const count=await page.evaluate(()=>qaSpeech.records.length);
  await page.locator(`[data-option="${q.correctOptionId}"]`).click();await page.waitForFunction(stem=>document.querySelector('#question-stem')?.textContent!==stem,stem);await page.waitForFunction(count=>qaSpeech.records.length>count,count);
  assert.equal(await page.locator('[data-action="speech-toggle"]').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(async()=>{const db=await import('./js/db.js');return(await db.all('attempts')).length;}),1);pass('answer immediately stops old speech and saves once; next question reads automatically');
  for(const theme of ['boss','cyber','neon']){const count=await page.evaluate(()=>qaSpeech.records.length);await page.locator('#play-theme').selectOption(theme);await page.waitForFunction(theme=>document.body.dataset.theme===theme,theme);assert.equal(await page.evaluate(()=>qaSpeech.records.length),count);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  mkdirSync('qa',{recursive:true});await page.screenshot({path:'qa/speech-mobile.png',fullPage:true});pass('three themes keep the same reading without restart or mobile overflow');
  await page.locator('[data-action="pause"]').click();assert.equal(await page.evaluate(()=>qaSpeech.pending),null);await page.locator('[data-action="resume"]').click();await page.waitForFunction(()=>!!qaSpeech.pending);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForSelector('#modal[open]');assert.equal(await page.evaluate(()=>qaSpeech.pending),null);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('[data-action="resume"]').click();await page.waitForFunction(()=>!!qaSpeech.pending);
  await page.locator('#brand').click();await page.waitForSelector('[data-action="leave-play"]');assert.equal(await page.evaluate(()=>qaSpeech.pending),null);await page.locator('[data-action="leave-play"]').click();await page.waitForSelector('[data-mode="quick"]');pass('pause, resume, backgrounding and home stop old speech safely');
  await page.reload();await page.waitForSelector('[data-mode="quick"]');const data=await page.evaluate(async()=>{const db=await import('./js/db.js');return{attempts:(await db.all('attempts')).length,prefs:await db.settings()};});assert.equal(data.attempts,1);assert.equal(data.prefs.speechAuto,true);assert.equal(data.prefs.speechRate,1.3);assert.equal(data.prefs.speechVolume,.8);assert.equal(await page.evaluate(()=>qaSpeech.records.length),0);
  await page.waitForLoadState('networkidle');await context.setOffline(true);await page.reload();await page.waitForSelector('[data-mode="quick"]');await page.locator('[data-mode="quick"]').first().click();await page.waitForFunction(()=>!!qaSpeech.pending);assert((await page.evaluate(()=>caches.keys())).includes('sg-study-deck-v1.3.0'));pass('settings and history survive reload; offline PWA includes speech module');
  await page.locator('[data-action="speech-toggle"]').click();await page.evaluate(()=>{qaSpeech.voices=[{lang:'en-US'}];});await page.locator('[data-action="speech-toggle"]').click();assert.equal(await page.locator('[data-action="speech-toggle"]').getAttribute('aria-pressed'),'false');assert.match(await page.locator('#toast').innerText(),/日本語/);pass('missing Japanese voice shows a recoverable message');assert.deepEqual(errors,[]);
}catch(e){console.log("DIAGNOSTIC",page?await page.evaluate(async()=>({text:document.body.innerText.slice(-1800),cacheKeys:await caches.keys(),controller:!!navigator.serviceWorker.controller,scripts:[...document.scripts].map(s=>s.src)})):null,errors);throw e;}finally{await browser?.close();await new Promise(done=>server.close(done));}
