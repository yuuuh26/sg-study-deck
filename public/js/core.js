export const APP_ID='sg-study-deck';
export const FORMAT_VERSION=1;
export const VERSION='1.2.0';
export const DEFAULTS={theme:'neon',effects:'high',sound:true,vibration:false,autoNext:1.1,master:0.75,bgm:0.55,sfx:0.45,mute:false,fade:2.5,repeat:'all',duck:true,themeMusic:true,trackId:null,assignments:{neon:[],boss:[],cyber:[]},dailyGoal:10,speechAuto:false,speechOptions:true,speechRate:1,speechVolume:.9,speechDuck:true};
export const dayKey=t=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
export const uid=()=>crypto.randomUUID();
export const percent=(n,d)=>d?Math.round(100*n/d):null;
export const byTime=(a,b)=>a.answeredAt.localeCompare(b.answeredAt)||a.attemptId.localeCompare(b.attemptId);
export function canonicalAttempts(attempts){
  const seen=new Set(); return [...attempts].sort(byTime).map(a=>{const firstAttempt=!seen.has(a.questionId);seen.add(a.questionId);return {...a,firstAttempt};});
}
export function statistics(attempts,sessions=[],period='day',dailyGoal=10){
  const logs=canonicalAttempts(attempts), first=logs.filter(a=>a.firstAttempt), tags=Object.create(null), buckets=Object.create(null);
  let xp=0;const dailyRepeats=Object.create(null);
  for(const a of logs){
    const dailyId=a.questionId+dayKey(a.answeredAt),repeat=dailyRepeats[dailyId]||0;
    if(repeat<3){xp+=a.correct?(a.firstAttempt?20:8):2; if(a.correct&&[5,10,20].includes(a.combo))xp+=Math.min(a.combo,20);}
    dailyRepeats[dailyId]=repeat+1;
    for(const tag of a.topicTagsSnapshot||[]){const g=tags[tag]??={total:0,correct:0,firstTotal:0,firstCorrect:0};g.total++;g.correct+=+a.correct;g.firstTotal+=+a.firstAttempt;g.firstCorrect+=+(a.firstAttempt&&a.correct);}
    let date=dayKey(a.answeredAt);
    if(period==='month')date=date.slice(0,7);
    if(period==='week'){const d=new Date(date+'T12:00:00+09:00');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));date=dayKey(d);}
    const g=buckets[date]??={date,total:0,correct:0,firstTotal:0,firstCorrect:0};g.total++;g.correct+=+a.correct;g.firstTotal+=+a.firstAttempt;g.firstCorrect+=+(a.firstAttempt&&a.correct);g.ids??=new Set();g.ids.add(a.questionId);g.unique=g.ids.size;g.level=Math.floor(Math.sqrt(xp/100))+1;
  }
  const days=[...new Set(logs.map(a=>dayKey(a.answeredAt)))].sort();let streak=0,d=new Date(dayKey(Date.now())+'T12:00:00+09:00');
  if(!days.includes(dayKey(d)))d.setUTCDate(d.getUTCDate()-1);
  while(days.includes(dayKey(d))){streak++;d.setUTCDate(d.getUTCDate()-1);}
  return {total:logs.length,correct:logs.filter(a=>a.correct).length,firstTotal:first.length,firstCorrect:first.filter(a=>a.correct).length,tags,buckets:Object.values(buckets).map(({ids,...bucket})=>bucket).sort((a,b)=>a.date.localeCompare(b.date)),xp,level:Math.floor(Math.sqrt(xp/100))+1,studyMs:sessions.reduce((s,v)=>s+(v.activeMs||0),0),streak,days,goalDays:days.filter(d=>logs.filter(a=>dayKey(a.answeredAt)===d).length>=dailyGoal).length};
}
export function rebuildReviews(attempts,pins={}){
  const state=Object.create(null); const intervals=[1,3,7,14,30];
  for(const a of canonicalAttempts(attempts)){
    const prev=state[a.questionId]||{stage:-1,wrong:0,streak:0,recent:[]};
    const stage=a.correct?Math.min(prev.stage+1,4):0;
    state[a.questionId]={questionId:a.questionId,stage,wrong:prev.wrong+ +!a.correct,streak:a.correct?prev.streak+1:0,lastCorrect:a.correct,lastAt:a.answeredAt,dueAt:new Date(new Date(a.answeredAt).getTime()+intervals[stage]*86400000).toISOString(),recent:[...prev.recent,a.correct].slice(-5),pinned:!!pins[a.questionId]};
  }
  return state;
}
export function weakness(q,review,stats,now=Date.now()){
  if(!review)return 0;
  const low=q.topicTags.reduce((s,t)=>{const g=stats.tags[t];return s+(g?.total>=3?1-g.correct/g.total:0);},0);
  return review.wrong*2+(review.lastCorrect?0:5)+(review.recent.filter(x=>!x).length*2)+(new Date(review.dueAt)<=now?3:0)+(review.pinned?4:0)+low*3;
}
export function selectQuestions(catalog,attempts,mode,count=10,pins={},rng=Math.random,now=Date.now()){
  const bank=catalog.filter(q=>q.status==='active'),seen=new Set(attempts.map(a=>a.questionId)),reviews=rebuildReviews(attempts,pins),stats=statistics(attempts);
  const random=arr=>arr.map(q=>({q,r:rng()})).sort((a,b)=>a.r-b.r).map(x=>x.q);
  if(mode==='first')return random(bank.filter(q=>!seen.has(q.questionId))).slice(0,count);
  if(mode==='due')return bank.filter(q=>reviews[q.questionId]&&new Date(reviews[q.questionId].dueAt)<=now).sort((a,b)=>reviews[a.questionId].dueAt.localeCompare(reviews[b.questionId].dueAt)).slice(0,count);
  if(mode==='mock'){
    const a=random(bank.filter(q=>q.subject==='A')),b=random(bank.filter(q=>q.subject==='B'));
    return a.length>=48&&b.length>=12?[...a.slice(0,48),...b.slice(0,12)]:[];
  }
  const used=new Set(),out=[]; const take=(arr,n)=>{for(const q of arr){if(out.length>=count||n<=0)break;if(!used.has(q.questionId)){out.push(q);used.add(q.questionId);n--;}}};
  if(mode==='weak'){
    const weak=bank.filter(q=>reviews[q.questionId]&&(reviews[q.questionId].wrong||reviews[q.questionId].pinned||new Date(reviews[q.questionId].dueAt)<=now)).sort((a,b)=>weakness(b,reviews[b.questionId],stats,now)-weakness(a,reviews[a.questionId],stats,now)+(rng()-.5));
    const weakTags=new Set(weak.flatMap(q=>q.topicTags));take(weak,Math.ceil(count*.7));take(random(bank.filter(q=>q.topicTags.some(t=>weakTags.has(t))&&!seen.has(q.questionId))),Math.ceil(count*.2));take(random(bank),count);
  }else{
    take(random(bank.filter(q=>!seen.has(q.questionId))),Math.ceil(count*.6));take(bank.filter(q=>reviews[q.questionId]&&new Date(reviews[q.questionId].dueAt)<=now),count);take(random(bank),count);
  }
  return random(out);
}
function assert(x,msg){if(!x)throw new Error(msg);}
const str=(v,max=100000)=>typeof v==='string'&&v.length>0&&v.length<=max;
export function validatePack(pack,existing=[]){
  assert(pack?.formatVersion===1&&Array.isArray(pack.questions)&&pack.questions.length>0&&pack.questions.length<=10000,'問題パックの形式・件数が不正です');
  const ids=new Set(),stems=new Set();
  for(const q of pack.questions){
    assert(str(q.questionId,160)&&/^[a-zA-Z0-9_.:-]+$/.test(q.questionId)&&!ids.has(q.questionId),'問題IDが不正または重複しています');ids.add(q.questionId);
    assert(Number.isInteger(q.revision)&&q.revision>0&&str(q.stem)&&!stems.has(q.stem.trim()),'問題本文・revisionが不正または重複しています');stems.add(q.stem.trim());
    assert(['A','B'].includes(q.subject)&&['active','retired','review_needed'].includes(q.status),'科目・採用状態が不正です');
    assert(['ipa_official','official_sample','ai_original'].includes(q.sourceType)&&/^https:\/\//.test(q.sourceUrl||''),'出典が必要です');
    assert(Array.isArray(q.topicTags)&&q.topicTags.length>0&&q.topicTags.every(t=>str(t,100)),'分野タグが必要です');
    assert(Array.isArray(q.options)&&q.options.length>=4&&q.options.length<=20,'選択肢は4〜20個です（科目Bは多肢選択に対応）');
    assert(Number.isInteger(q.difficulty)&&q.difficulty>=1&&q.difficulty<=5&&Number.isInteger(q.sourceYear)&&q.sourceYear>=2000&&q.sourceYear<=2100&&str(q.sourceExam)&&q.sourceNumber!==undefined&&Number.isFinite(Date.parse(q.contentUpdatedAt)),'出典年度・区分・難易度・更新日が不正です');
    const opts=q.options.map(o=>o.id);assert(new Set(opts).size===opts.length&&q.options.every(o=>str(o.id,40)&&str(o.text))&&opts.includes(q.correctOptionId),'選択肢ID・正解が不正です');
    assert(str(q.explanation)&&opts.every(id=>str(q.optionExplanations?.[id])),'正解と全選択肢の解説が必要です');
    if(q.status==='active')assert(q.verification?.answerChecked===true&&q.verification?.explanationChecked===true&&str(q.verification?.evidenceUrl)&&/^https:\/\//.test(q.verification.evidenceUrl),'検証が完了していない問題は採用できません');
    assert(!q.media?.length,'画像パックは未対応です。表・図は本文の文章表現にし、改変表示を付けてください');
    const old=existing.find(x=>x.questionId===q.questionId);
    if(old){assert(q.revision>=old.revision,'古いrevisionでは上書きできません');assert(q.correctOptionId===old.correctOptionId&&JSON.stringify(q.options)===JSON.stringify(old.options),'正解・選択肢の実質変更には新しい問題IDが必要です');if(q.revision===old.revision)assert(JSON.stringify(q)===JSON.stringify(old),'内容変更にはrevisionを増やしてください');}
    const duplicate=existing.find(x=>x.questionId!==q.questionId&&x.stem.trim()===q.stem.trim());assert(!duplicate,'別IDの同一設問が既にあります');
  }
  return pack.questions;
}
export function validateBackup(data){
  assert(data?.appId===APP_ID&&data.formatVersion===FORMAT_VERSION,'このアプリの対応JSONではありません');
  assert(Array.isArray(data.attempts)&&Array.isArray(data.sessions)&&data.attempts.length<=1000000&&data.sessions.length<=100000,'履歴の形式・件数が不正です');
  const ids=new Set();for(const a of data.attempts){assert(str(a.attemptId,200)&&!ids.has(a.attemptId)&&str(a.questionId,160)&&str(a.sessionId,200)&&str(a.selectedOptionId,40)&&typeof a.correct==='boolean'&&Number.isInteger(a.revision)&&a.revision>0&&Number.isFinite(Date.parse(a.answeredAt))&&Array.isArray(a.topicTagsSnapshot)&&a.topicTagsSnapshot.every(t=>str(t,100))&&Number.isFinite(a.responseMs)&&a.responseMs>=0,'回答履歴が不正です');ids.add(a.attemptId);}
  const sids=new Set();for(const s of data.sessions){assert(str(s.sessionId,200)&&!sids.has(s.sessionId)&&Number.isFinite(s.activeMs)&&s.activeMs>=0,'セッションが不正です');sids.add(s.sessionId);}
  assert(data.attempts.every(a=>sids.has(a.sessionId)),'回答に対応するセッションがありません');
  assert(data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings),'設定が不正です');
  const settings=structuredClone(DEFAULTS);
  for(const k of ['theme','effects','repeat']){const vals={theme:['neon','boss','cyber'],effects:['off','low','normal','high'],repeat:['one','all','shuffle']}[k];if(vals.includes(data.settings[k]))settings[k]=data.settings[k];}
  for(const k of ['sound','vibration','mute','duck','themeMusic','speechAuto','speechOptions','speechDuck'])if(typeof data.settings[k]==='boolean')settings[k]=data.settings[k];
  for(const k of ['master','bgm','sfx','speechVolume'])if(Number.isFinite(data.settings[k]))settings[k]=Math.max(0,Math.min(1,data.settings[k]));
  if([.7,.85,1,1.15,1.3,1.5].includes(data.settings.speechRate))settings.speechRate=data.settings.speechRate;
  if([0,.7,1.1,1.5].includes(data.settings.autoNext))settings.autoNext=data.settings.autoNext;
  if([1,2.5,4].includes(data.settings.fade))settings.fade=data.settings.fade;
  if(Number.isFinite(data.settings.dailyGoal))settings.dailyGoal=Math.min(100,Math.max(1,data.settings.dailyGoal));
  if(typeof data.settings.trackId==='string')settings.trackId=data.settings.trackId.slice(0,200);
  if(data.settings.assignments)for(const t of ['neon','boss','cyber']){const list=data.settings.assignments[t];if(Array.isArray(list)&&list.every(id=>str(id,200)))settings.assignments[t]=list;}
  const tracks=Array.isArray(data.audioTracks)?data.audioTracks.map(t=>{assert(str(t.trackId,200)&&str(t.name,200)&&Number.isFinite(t.size)&&t.size>=0,'楽曲情報が不正です');return {...t};}):[];
  const pins={};if(data.pins&&typeof data.pins==='object')for(const [id,v]of Object.entries(data.pins))if(str(id,160)&&typeof v==='boolean')pins[id]=v;
  return {...data,attempts:canonicalAttempts(data.attempts),settings,pins,audioTracks:tracks};
}
export function backupDue(sync,now=Date.now()){return sync.revision>sync.sentRevision&&now-(sync.lastSuccess||0)>=48*3600000;}
