await import(process.env.SG_FAKE_IDB_PATH || 'fake-indexeddb/auto');
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePack,validateBackup,statistics,DEFAULTS,UNKNOWN_OPTION_ID,selectQuestions} from '../public/js/core.js';
import {PRACTICAL_COURSES,scopedQuestions,selectPracticalQuestions,practiceCount,practicalSetOf,questionLabel} from '../public/js/practical.js';
import {aiQuestionPrompt,aiQuestionsPrompt} from '../public/js/ai-question.js';
import * as db from '../public/js/db.js';
const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url)));
const official=load('ipa-verified.json'),first=load('practical-verified.json'),second=load('practical2-verified.json');
const legacy=[...official.questions,...first.questions],all=[...legacy,...second.questions];
const answer=(id,q,correct=false)=>({attemptId:id,questionId:q.questionId,revision:q.revision,sessionId:'legacy',answeredAt:'2026-10-09T09:00:00Z',selectedOptionId:correct?q.correctOptionId:UNKNOWN_OPTION_ID,correct,responseMs:200,topicTagsSnapshot:q.topicTags});

test('set 2 has 32 distinct verified original scenarios and short notes for terms actually used in their stems',()=>{
 assert.equal(validatePack(second,legacy).length,32);assert.equal(new Set(all.map(q=>q.questionId)).size,86);
 for(const c of PRACTICAL_COURSES.filter(c=>c.set===2))assert.equal(practiceCount(all,c.topic,2),8);
 for(const q of second.questions){assert.equal(q.sourceType,'ai_original');assert.equal(q.practicalSet,2);assert.equal(q.options.length,4);assert(q.termNotes.length>=1&&q.termNotes.length<=2);for(const t of q.termNotes){assert(q.stem.includes(t.term));assert(t.meaning.length<=100);}assert(q.verification.evidenceSection);assert.match(q.verification.method,/第三者の人手レビューは未実施/);assert.equal(q.verification.answerChecked,true);assert.equal(q.verification.explanationChecked,true);}
});
test('security distinctions retain independently specified correct meanings, including limits of protections',()=>{
 const expected={'net-01':/販売者が誠実/,'net-02':/入力を止め/,'net-03':/なりすまして/,'net-04':/見えなくなるとは限らない/,'net-05':/偽サイト.*判断も必要/,'net-06':/IPアドレス/,'net-07':/名前だけ.*保証されない/,'net-08':/許可・拒否/,'fraud-02':/公式アプリ/,'fraud-03':/コードを渡さず/,'fraud-04':/脆弱性/,'fraud-06':/有効化せず/,'fraud-08':/独立して確認/,'cloud-02':/どの情報へ何の操作/,'cloud-03':/自分のデータ.*権限・設定/,'cloud-04':/別のバックアップ/,'cloud-05':/送受信端末/,'cloud-07':/組合せ/,'cloud-08':/本人の指示と区別/,'incident-01':/ログイン状態.*無効/,'incident-02':/隔離.*報告/,'incident-03':/ログなどを消さず/,'incident-04':/遠隔.*データを消し/,'incident-05':/復元を試し/,'incident-06':/不正に変更/,'incident-07':/起こり得て.*影響/,'incident-08':/手順、教育を改善/};
 for(const [id,pattern] of Object.entries(expected)){const q=second.questions.find(q=>q.questionId==='sg-practical2-'+id);assert.match(q.options.find(o=>o.id===q.correctOptionId).text,pattern);}
});
test('stage mixes isolate both sets; old set-1 packs default correctly and eligible mocks exclude both stages',()=>{
 assert.equal(practicalSetOf(first.questions[0]),1);assert.match(questionLabel(second.questions[0]),/実用入門②.*非公式/);
 for(const set of [1,2]){const bank=scopedQuestions(all,{learningTrack:'practical',practicalSet:set});assert.equal(bank.length,32);assert(bank.every(q=>practicalSetOf(q)===set));const qs=selectPracticalQuestions(bank,[],100);assert.equal(qs.length,32);assert.equal(qs[0].learningOrder,1);assert.equal(new Set(qs.map(q=>q.questionId)).size,32);}
 assert.equal(scopedQuestions(all,{learningTrack:'practical',topic:'認証',practicalSet:2}).length,0);
 const bank=scopedQuestions(all,{learningTrack:'practical',topic:'クラウド・AI',practicalSet:2}),qs=selectPracticalQuestions(bank,[],3);
 assert.deepEqual(qs.map(q=>q.concept),['アクセス制御','OAuth','責任共有モデル']);assert.equal(selectPracticalQuestions(bank,qs.map((q,i)=>answer('seen-'+i,q)),3)[0].concept,'同期');
 const a=Array.from({length:48},(_,i)=>({...official.questions[0],questionId:'a-'+i})),b=Array.from({length:12},(_,i)=>({...official.questions[0],questionId:'b-'+i,subject:'B'}));
 assert(selectQuestions([...a,...b,...first.questions,...second.questions],[],'mock',60).every(q=>q.learningTrack!=='practical'));
});
test('updating 54 to 86 questions is idempotent and preserves old practical records, audio, active sessions and sync',async()=>{
 await db.importPack(official);await db.importPack(first);const q=first.questions[0],s={sessionId:'legacy',mode:'quick',learningTrack:'practical',topic:'認証',questionIds:first.questions.slice(0,3).map(q=>q.questionId),nextIndex:1,activeMs:500,status:'interrupted'};
 await db.saveAnswer(answer('old',q),s);await db.addTrack({trackId:'audio',name:'My BGM',size:4},new Blob(['wave']));await db.saveSettings({...DEFAULTS,quickTopic:'暗号・ハッシュ',quickCount:3});
 const before=await db.snapshot(),sync=await db.syncState();await db.importPack(second);await db.importPack(second);const after=await db.snapshot();assert.deepEqual({...after,exportedAt:before.exportedAt},before);assert.deepEqual(await db.syncState(),sync);assert.equal((await db.all('questionCatalog')).length,86);assert.equal((await db.get('audioBlobs','audio')).blob.size,4);assert.deepEqual((await db.all('questionCatalog')).filter(q=>legacy.some(l=>l.questionId===q.questionId)).sort((a,b)=>a.questionId.localeCompare(b.questionId)),[...legacy].sort((a,b)=>a.questionId.localeCompare(b.questionId)));
 await db.saveAnswer({...answer('review',q,true),answeredAt:'2026-10-10T09:00:00Z'},s);const stats=statistics(await db.all('attempts'));assert.equal(stats.firstTotal,1);assert.equal(stats.firstCorrect,0);assert.equal(stats.correct,1);
});
test('set-2 interrupted sessions survive JSON restore and safety copies while legacy sessions remain readable',async()=>{
 const q=second.questions[0],s={sessionId:'second',mode:'quick',learningTrack:'practical',practicalSet:2,topic:'ネット・ブラウザ',questionIds:second.questions.slice(0,3).map(q=>q.questionId),nextIndex:1,activeMs:200,status:'interrupted'};
 await db.saveAnswer({...answer('new',q),sessionId:s.sessionId},s);const snap=await db.snapshot();assert.equal(validateBackup(snap).sessions.find(x=>x.sessionId==='second').practicalSet,2);assert.equal(validateBackup(snap).sessions.find(x=>x.sessionId==='legacy').practicalSet,undefined);await db.restore(snap,(await db.syncState()).revision);assert.equal((await db.all('sessions')).find(x=>x.sessionId==='second').practicalSet,2);assert.equal((await db.all('attempts')).length,3);assert.equal((await db.get('audioBlobs','audio')).blob.size,4);assert((await db.all('safetyCopies')).length>=1);
});
test('individual and batch AI prompts include vocabulary explanations and unknown-answer context',()=>{
 const q=second.questions[2],a=answer('unknown',q),prompt=aiQuestionPrompt(q,a);assert.match(prompt,/【用語メモ】/);assert.match(prompt,/分からない/);for(const t of q.termNotes)assert(prompt.includes(t.term+'：'+t.meaning));assert(aiQuestionsPrompt([{q,attempt:a},{q:second.questions[17],attempt:null}]).includes('OAuth：'));assert(!aiQuestionPrompt(first.questions[0]).includes('【用語メモ】'));
});
test('invalid set or term metadata is rejected before catalog mutation',()=>{
 const q=second.questions[0];for(const change of [{practicalSet:0},{practicalSet:'2'},{learningTrack:undefined},{termNotes:[]},{termNotes:[{term:'本文にない用語',meaning:'説明'}]},{termNotes:[q.termNotes[0],q.termNotes[0]]},{termNotes:[null]},{termNotes:[{term:'TLS',meaning:''}]}])assert.throws(()=>validatePack({...second,questions:[{...q,...change}]}));
});
