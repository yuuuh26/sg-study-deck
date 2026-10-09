// Read only the visible question and choices. Answers/explanations are never sent to TTS.
export function speechChunks(text,limit=160){
  const chunks=[];
  for(const sentence of String(text??'').replace(/\r/g,'').split(/(?<=[。！？!?\n])/u)){
    let chars=Array.from(sentence.trim());
    while(chars.length>limit){
      let cut=limit;
      for(let i=limit-1;i>=Math.floor(limit/2);i--)if(/[、，,；;\s]/u.test(chars[i])){cut=i+1;break;}
      const part=chars.slice(0,cut).join('').trim();if(part)chunks.push(part);chars=chars.slice(cut);
    }
    const part=chars.join('').trim();if(part)chunks.push(part);
  }
  return chunks;
}
export function questionSpeech(question,includeOptions=true){
  if(!question)return [];
  return [String(question.stem||''),...(includeOptions?(question.options||[]).map(o=>`選択肢 ${o.id}。${o.text}`):[])].flatMap(text=>speechChunks(text));
}
const messages={
  'not-allowed':'読み上げボタンを押して、音声を開始してください。',
  'language-unavailable':'日本語の音声を利用できません。端末の読み上げ設定を確認してください。',
  'voice-unavailable':'日本語の音声を利用できません。端末の読み上げ設定を確認してください。',
  'synthesis-unavailable':'端末の読み上げ音声を利用できません。端末の読み上げ設定を確認してください。',
  'network':'音声を取得できません。通信状態か、端末に保存された日本語音声を確認してください。'
};
export class SpeechReader{
  constructor(settings,onState=()=>{},api=globalThis){
    this.settings={...settings};this.onState=onState;this.synth=api.speechSynthesis;this.Utterance=api.SpeechSynthesisUtterance;
    this.supported=!!(this.synth&&this.Utterance);this.active=false;this.generation=0;this.timer=null;this.utterance=null;this.voices=[];
    this.refreshVoices=()=>{try{this.voices=this.synth.getVoices();}catch{this.voices=[];}};
    if(this.supported){this.refreshVoices();this.synth.addEventListener?.('voiceschanged',this.refreshVoices);}
  }
  applySettings(settings){this.settings={...settings};if(this.active&&(settings.mute||settings.master<=0||settings.speechVolume<=0))this.stop();}
  report(message=''){this.onState({speaking:this.active,supported:this.supported,message});}
  stop(){
    ++this.generation;clearTimeout(this.timer);this.timer=null;
    if(this.utterance){this.utterance.onstart=this.utterance.onend=this.utterance.onerror=null;this.utterance=null;}
    if(this.active){this.active=false;try{this.synth.cancel();}catch{}this.report();}
  }
  fail(message,generation){if(generation!==this.generation)return;this.stop();this.report(message);}
  read(question){return this.speak(questionSpeech(question,this.settings.speechOptions!==false));}
  readText(text){return this.speak(speechChunks(text));}
  speak(chunks){
    this.stop();
    if(!this.supported){this.report('このブラウザは読み上げに対応していません。');return false;}
    if(this.settings.mute||this.settings.master<=0||this.settings.speechVolume<=0){this.report('ミュートを解除し、読み上げと全体の音量を上げてください。');return false;}
    if(!chunks.length)return false;
    this.refreshVoices();
    const japanese=this.voices.filter(v=>/^ja(?:[-_]|$)/i.test(v.lang));
    if(this.voices.length&&!japanese.length){this.report(messages['language-unavailable']);return false;}
    const voice=japanese.find(v=>v.localService)||japanese.find(v=>v.default)||japanese[0];
    const generation=this.generation;this.active=true;this.report();
    const next=index=>{
      if(generation!==this.generation||!this.active)return;
      if(index===chunks.length){this.active=false;this.utterance=null;clearTimeout(this.timer);this.timer=null;this.report();return;}
      const utterance=new this.Utterance(chunks[index]);this.utterance=utterance;
      utterance.lang='ja-JP';if(voice)utterance.voice=voice;
      utterance.rate=Math.max(.6,Math.min(1.6,this.settings.speechRate||1));
      utterance.volume=Math.max(0,Math.min(1,(this.settings.master??.75)*(this.settings.speechVolume??.9)));
      const timeout=()=>this.fail('読み上げが応答しませんでした。もう一度、読み上げボタンを押してください。',generation);
      this.timer=setTimeout(timeout,10000);
      utterance.onstart=()=>{if(generation!==this.generation)return;clearTimeout(this.timer);this.timer=setTimeout(timeout,Math.max(30000,chunks[index].length*600/utterance.rate+10000));};
      utterance.onend=()=>{if(generation!==this.generation)return;clearTimeout(this.timer);this.utterance=null;next(index+1);};
      utterance.onerror=e=>this.fail(messages[e.error]||'読み上げを再生できませんでした。端末の音声設定を確認してください。',generation);
      try{this.synth.speak(utterance);}catch{this.fail('読み上げを開始できませんでした。もう一度、ボタンを押してください。',generation);}
    };
    next(0);return this.active;
  }
  dispose(){this.stop();this.synth?.removeEventListener?.('voiceschanged',this.refreshVoices);}
}
