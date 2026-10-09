await import(process.env.SG_FAKE_IDB_PATH || 'fake-indexeddb/auto');
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePack,statistics,DEFAULTS,UNKNOWN_OPTION_ID,selectQuestions,validateBackup} from '../public/js/core.js';
import {PRACTICAL_COURSES,scopedQuestions,selectPracticalQuestions,questionTopics,practiceCount} from '../public/js/practical.js';
import * as db from '../public/js/db.js';
const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url)));
const official=load('ipa-verified.json'),practical=load('practical-verified.json'),all=[...official.questions,...practical.questions];
const answer=(id,q,correct=false)=>({attemptId:id,questionId:q.questionId,revision:q.revision,sessionId:'existing',answeredAt:'2026-10-09T09:00:00Z',selectedOptionId:correct?q.correctOptionId:UNKNOWN_OPTION_ID,correct,responseMs:200,topicTagsSnapshot:q.topicTags});

test('32 original beginner questions have primary evidence, four explanations, distinct permanent IDs and four useful fields',()=>{
 assert.equal(validatePack(practical,official.questions).length,32);assert.equal(new Set(all.map(q=>q.questionId)).size,54);
 for(const course of PRACTICAL_COURSES)assert.equal(practiceCount(all,course.topic),8);
 assert(questionTopics(all).includes('暗号・ハッシュ'));
 for(const q of practical.questions){assert.equal(q.sourceType,'ai_original');assert.equal(q.options.length,4);assert(q.verification.evidenceSection);assert(q.verification.syllabusUrl.includes('syllabus_sg_ver4_1'));assert.match(q.versionNote,/公式解説ではありません/);}
});
test('important practical distinctions have the independently specified correct meaning',()=>{
 const expected={
  'auth-01':/パスワードと、登録済みの認証アプリ/,
  'auth-02':/両方とも記憶要素/,
  'auth-03':/リアルタイムに盗まれ/,
  'auth-04':/端末側で/,
  'crypto-01':/一定の長さ/,
  'crypto-03':/無害である保証ではない/,
  'crypto-04':/異なる入力/,
  'crypto-05':/ソルト.*計算コスト/,
  'crypto-07':/受信者の公開鍵.*受信者の秘密鍵/,
  'crypto-08':/改変を検証/,
  'access-04':/入力情報をサイトへ送れば盗まれ/,
  'access-05':/変更がホスト側にも残る/,
  'vuln-03':/ゼロデイ攻撃/,
  'vuln-08':/3つ.*2種類.*1つ/
 };
 for(const [id,pattern] of Object.entries(expected)){const q=practical.questions.find(q=>q.questionId==='sg-practical-'+id);assert.match(q.options.find(o=>o.id===q.correctOptionId).text,pattern);}
});
test('new course questions start at the basics, continue unseen concepts, then fill with distinct reviews',()=>{
 const bank=scopedQuestions(all,{learningTrack:'practical',topic:'暗号・ハッシュ'});
 assert.equal(bank.length,8);assert(bank.every(q=>q.topicTags.includes('暗号・ハッシュ')));
 const first=selectPracticalQuestions(bank,[],5);assert.deepEqual(first.map(q=>q.concept),['ハッシュ値','同じデータとハッシュ','ハッシュの一致と安全性','ハッシュの衝突','パスワードの保存とソルト']);
 const next=selectPracticalQuestions(bank,first.map((q,i)=>answer('seen-'+i,q)),5);
 assert.deepEqual(next.slice(0,3).map(q=>q.concept),['共通鍵暗号','公開鍵暗号','電子署名']);assert.equal(new Set(next.map(q=>q.questionId)).size,5);
 assert.equal(selectPracticalQuestions(bank,[],100).length,8);assert.equal(selectPracticalQuestions(bank,[],0).length,0);
 assert.equal(selectPracticalQuestions([{...bank[0],status:'retired'}],[],5).length,0);
});
test('introductory questions cannot fill the A48 exam requirement or appear in an eligible mock',()=>{
 const b=Array.from({length:12},(_,i)=>({...official.questions[0],questionId:'b-'+i,subject:'B'}));
 assert.equal(selectQuestions([...all,...b],[],'mock',60).length,0);
 const a=Array.from({length:48},(_,i)=>({...official.questions[0],questionId:'a-'+i}));
 const selected=selectQuestions([...a,...b,...practical.questions],[],'mock',60);assert.equal(selected.length,60);assert(selected.every(q=>q.learningTrack!=='practical'));
});
test('installing the real new pack twice preserves previous answers, sessions, audio and sync state exactly',async()=>{
 await db.importPack(official);const session={sessionId:'existing',mode:'quick',questionIds:[official.questions[0].questionId],nextIndex:1,activeMs:500,status:'interrupted'};
 await db.saveAnswer(answer('old',official.questions[0]),session);await db.addTrack({trackId:'old-audio',name:'My music',size:4},new Blob(['wave']));
 const before=await db.snapshot(),sync=await db.syncState();await db.importPack(practical);await db.importPack(practical);
 const after=await db.snapshot();assert.deepEqual({...after,exportedAt:before.exportedAt},before);
 assert.deepEqual(await db.syncState(),sync);assert.equal((await db.all('questionCatalog')).length,54);assert.equal((await db.get('audioBlobs','old-audio')).blob.size,4);assert.equal(statistics(await db.all('attempts')).firstCorrect,0);
 const q=practical.questions[0],nextSession={...session,sessionId:'new-course',topic:'認証',learningTrack:'practical'};
 await db.saveAnswer({...answer('new',q),sessionId:'new-course'},nextSession);await db.saveAnswer({...answer('new-review',q,true),sessionId:'new-course',answeredAt:'2026-10-10T09:00:00Z'},nextSession);
 const stats=statistics(await db.all('attempts'));assert.equal(stats.firstTotal,2);assert.equal(stats.firstCorrect,0);assert.equal(stats.correct,1);assert.equal(stats.total,3);
});
test('field preference and interrupted course survive JSON restoration; legacy backups default to all fields',async()=>{
 await db.saveSettings({...DEFAULTS,quickTopic:'暗号・ハッシュ',quickCount:3});const snap=await db.snapshot();assert.equal(validateBackup(snap).settings.quickTopic,'暗号・ハッシュ');
 assert.equal(validateBackup({...snap,settings:{quickCount:5}}).settings.quickTopic,'');assert.equal(validateBackup({...snap,settings:{quickTopic:5}}).settings.quickTopic,'');
 await db.restore(snap,(await db.syncState()).revision);assert.equal((await db.settings()).quickTopic,'暗号・ハッシュ');assert.equal((await db.all('sessions')).find(s=>s.sessionId==='new-course').learningTrack,'practical');assert.equal((await db.all('attempts')).length,3);assert.equal((await db.get('audioBlobs','old-audio')).blob.size,4);
});
test('invalid original-course metadata is rejected without labeling it official',()=>{
 for(const changes of [{sourceType:'ipa_official'},{learningOrder:0},{concept:''},{learningTrack:'exam'},{subject:'B'}])assert.throws(()=>validatePack({...practical,questions:[{...practical.questions[0],...changes}]}));
});
