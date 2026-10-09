import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechReader,questionSpeech,speechChunks,OPTION_PAUSE_MS} from '../public/js/speech.js';
import {AudioEngine} from '../public/js/audio.js';
import {DEFAULTS} from '../public/js/core.js';
const question={stem:'情報を守る方法はどれか。',options:[{id:'ア',text:'認証を確認する。'},{id:'イ',text:'公開する。'}],correctOptionId:'ア',explanation:'秘密の答え合わせ'};
function fixture(settings={}){
  const states=[],utterances=[],listeners=new Map();
  const local={name:'Japanese local',lang:'ja-JP',localService:true},remote={name:'Japanese cloud',lang:'ja-JP',localService:false,default:true};
  const synth={voices:[remote,local],cancelled:0,getVoices(){return this.voices;},speak(u){utterances.push(u);u.onstart?.();},cancel(){this.cancelled++;},addEventListener(n,fn){listeners.set(n,fn);},removeEventListener(n){listeners.delete(n);}};
  class Utterance{constructor(text){this.text=text;}}
  const reader=new SpeechReader({...DEFAULTS,...settings},state=>states.push(state),{speechSynthesis:synth,SpeechSynthesisUtterance:Utterance});
  return{reader,synth,states,utterances,listeners,local};
}
test('long Japanese text is complete, bounded and never includes the correct answer or explanation',()=>{
  const text=('暗号化、認証、アクセス制御を確認する🙂').repeat(50)+'。';
  const chunks=speechChunks(text);assert(chunks.every(c=>Array.from(c).length<=160));assert.equal(chunks.join(''),text);
  const all=questionSpeech({...question,stem:text});assert(all.includes('ア'));assert(all.includes('認証を確認する。'));assert(!all.join('').includes('選択肢'));assert(!all.join('').includes(question.explanation));
  assert.deepEqual(questionSpeech(question,false),[question.stem]);
});
test('Japanese local voice, speed and separate volume are applied; chunks continue in order',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture({speechRate:1.3,speechVolume:.8,master:.5});t.after(()=>f.reader.dispose());
  assert(f.reader.read(question));const first=f.utterances[0];assert.equal(first.voice,f.local);assert.equal(first.lang,'ja-JP');assert.equal(first.rate,1.3);assert.equal(first.volume,.4);
  for(let i=0;i<questionSpeech(question).length;i++){assert.equal(f.utterances[i].text,questionSpeech(question)[i]);f.utterances[i].onend();t.mock.timers.tick(OPTION_PAUSE_MS);}
  assert.equal(f.reader.active,false);assert.equal(f.states.filter(s=>s.speaking).length,1);assert.equal(f.states.at(-1).speaking,false);
});
test('rapid stop and restart ignore stale end/error events and never queue an old question',t=>{
  const f=fixture();t.after(()=>f.reader.dispose());f.reader.read(question);const end=f.utterances[0].onend,error=f.utterances[0].onerror;
  f.reader.stop();f.reader.readText('新しい問題。');const latest=f.utterances.at(-1),count=f.utterances.length;end();error({error:'network'});
  assert.equal(f.utterances.length,count);assert(f.reader.active);assert.equal(f.synth.cancelled,1);latest.onend();assert.equal(f.reader.active,false);
});
test('unsupported, missing Japanese voice, mute and playback error leave readable controls',t=>{
  const unsupported=new SpeechReader(DEFAULTS,()=>{},{});assert.equal(unsupported.read(question),false);
  const f=fixture();t.after(()=>f.reader.dispose());f.synth.voices=[{lang:'en-US'}];assert.equal(f.reader.read(question),false);assert.match(f.states.at(-1).message,/日本語/);
  f.synth.voices=[f.local];f.listeners.get('voiceschanged')();assert(f.reader.read(question));f.utterances.at(-1).onerror({error:'not-allowed'});assert.equal(f.reader.active,false);assert.match(f.states.at(-1).message,/ボタン/);
  f.reader.applySettings({...DEFAULTS,mute:true});assert.equal(f.reader.read(question),false);assert.match(f.states.at(-1).message,/ミュート/);
});
test('empty voice list uses ja-JP system fallback; global mute immediately cancels current speech',t=>{
  const f=fixture();t.after(()=>f.reader.dispose());f.synth.voices=[];assert(f.reader.read(question));assert.equal(f.utterances[0].lang,'ja-JP');
  f.reader.applySettings({...DEFAULTS,mute:true});assert.equal(f.reader.active,false);assert.equal(f.synth.cancelled,1);
});
test('speech keeps BGM ducked when an effect ends, and stopping restores it without pausing tracks',()=>{
  const engine=new AudioEngine(DEFAULTS);let target;engine.context={};engine.duckGain={gain:{}};engine.ramp=(_gain,value)=>{target=value;};
  engine.wantPlay=true;engine.setSpeechActive(true);assert.equal(target,.35);engine.effectDuck=true;engine.updateDucking();assert.equal(target,.35);
  engine.effectDuck=false;engine.updateDucking();assert.equal(target,.35);engine.setSpeechActive(false);assert.equal(target,1);assert.equal(engine.wantPlay,true);
  engine.settings={...DEFAULTS,speechDuck:false};engine.setSpeechActive(true);assert.equal(target,1);
});

test('choice label is followed by a 400ms pause; stopping during the pause cancels delayed speech',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();t.after(()=>f.reader.dispose());
 f.reader.read(question);f.utterances[0].onend();assert.equal(f.utterances[1].text,'ア');
 f.utterances[1].onend();assert(f.reader.active);assert.equal(f.utterances.length,2);
 t.mock.timers.tick(OPTION_PAUSE_MS-1);assert.equal(f.utterances.length,2);
 t.mock.timers.tick(1);assert.equal(f.utterances[2].text,'認証を確認する。');
 f.utterances[2].onend();assert.equal(f.utterances[3].text,'イ');f.utterances[3].onend();f.reader.stop();
 f.reader.readText('別の問題。');t.mock.timers.tick(OPTION_PAUSE_MS+1);assert.equal(f.utterances.length,5);assert.equal(f.utterances[4].text,'別の問題。');
});
