await import(process.env.SG_FAKE_IDB_PATH || 'fake-indexeddb/auto');
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {UNKNOWN_OPTION_ID,DEFAULTS,APP_ID,statistics,rebuildReviews,selectQuestions,validateBackup,validatePack,quickCount} from '../public/js/core.js';
import {aiQuestionPrompt,aiQuestionsPrompt,collectMistakes} from '../public/js/ai-question.js';
import * as db from '../public/js/db.js';
const bank=JSON.parse(readFileSync(new URL('../public/data/ipa-verified.json',import.meta.url))).questions,q=bank[0];
const answer=(id,question=q,option=UNKNOWN_OPTION_ID,sessionId='s')=>({attemptId:id,questionId:question.questionId,revision:question.revision,sessionId,answeredAt:'2026-10-09T08:00:00Z',selectedOptionId:option,correct:option===question.correctOptionId,responseMs:100,topicTagsSnapshot:question.topicTags});
test('unknown first response is an incorrect first attempt and is prioritized for later practice',()=>{
 const unknown=answer('a'),correct={...answer('b',q,q.correctOptionId),answeredAt:'2026-10-10T08:00:00Z'};
 const stats=statistics([unknown,correct]);assert.equal(stats.firstTotal,1);assert.equal(stats.firstCorrect,0);assert.equal(stats.correct,1);assert.equal(stats.unknown,1);assert.equal(stats.total,2);
 assert.equal(rebuildReviews([unknown])[q.questionId].wrong,1);assert.equal(selectQuestions(bank,[unknown],'weak',1,{},()=>.4)[0].questionId,q.questionId);
 assert.equal(selectQuestions([q],[unknown],'first').length,0);
 const conflict=structuredClone(q);conflict.options[0].id=UNKNOWN_OPTION_ID;assert.throws(()=>validatePack({formatVersion:1,questions:[conflict]}));
});
test('custom quick size survives backup; old settings default to five without changing schema',()=>{
 assert.equal(quickCount(3),3);assert.equal(quickCount('7'),7);assert.equal(quickCount(8.6),9);assert.equal(quickCount(0),1);assert.equal(quickCount(200),100);assert.equal(quickCount('invalid'),5);
 const data={appId:APP_ID,formatVersion:1,attempts:[answer('a')],sessions:[{sessionId:'s',activeMs:0}],settings:{quickCount:7}};
 assert.equal(validateBackup(data).settings.quickCount,7);assert.equal(validateBackup({...data,settings:{}}).settings.quickCount,5);
 assert.equal(validateBackup({...data,settings:{quickCount:1000}}).settings.quickCount,100);
 assert.throws(()=>validateBackup({...data,attempts:[{...answer('a'),correct:true}]}));
});
test('batch question contains the last failed response per problem and labels unknown honestly',()=>{
 const unknown=answer('a'),later={...answer('b',q,q.options.find(o=>o.id!==q.correctOptionId).id),answeredAt:'2026-10-09T09:00:00Z'},other=answer('c',bank[1]),elsewhere=answer('d',bank[2],UNKNOWN_OPTION_ID,'other');
 const logs=[unknown,later,other,elsewhere],before=structuredClone(logs),entries=collectMistakes(bank,logs,'s');assert.equal(entries.length,2);assert.equal(entries[0].attempt.attemptId,'b');assert.deepEqual(logs,before);
 const prompt=aiQuestionsPrompt(entries);assert(prompt.includes(q.stem));assert(prompt.includes(bank[1].stem));assert(!prompt.includes(bank[2].stem));assert.match(prompt,/分からない（選択肢を選ばず/);assert.match(prompt,/問題 2 \/ 2/);assert(prompt.includes(q.sourceUrl));assert.equal(aiQuestionsPrompt([]),'');
 assert.match(aiQuestionPrompt(q,unknown),/分からない（選択肢を選ばず/);assert.match(aiQuestionPrompt(q),/回答記録はありません/);
});
test('unknown saves exactly once, survives safe restore, and legacy quick defaults preserve audio and revisions',async()=>{
 await db.importPack({formatVersion:1,questions:bank});const session={sessionId:'s',activeMs:0,status:'complete',startedAt:'2026-10-09T08:00:00Z'};
 await Promise.all([db.saveAnswer(answer('unknown'),session),db.saveAnswer(answer('unknown'),session)]);assert.equal((await db.all('attempts')).length,1);
 await assert.rejects(db.saveAnswer({...answer('invalid'),correct:true},session));assert.equal((await db.all('attempts')).length,1);
 await db.addTrack({trackId:'audio',name:'Test',size:4,duration:1},new Blob(['wave']));const legacy=structuredClone(DEFAULTS);delete legacy.quickCount;await db.put('settings',{key:'preferences',value:legacy});
 const revision=(await db.syncState()).revision;assert.equal((await db.settings()).quickCount,5);assert.equal((await db.syncState()).revision,revision);
 const snapshot=await db.snapshot();await db.restore(snapshot,revision);assert.equal((await db.all('attempts'))[0].selectedOptionId,UNKNOWN_OPTION_ID);assert.equal((await db.get('audioBlobs','audio')).blob.size,4);assert.equal((await db.all('safetyCopies')).length,1);
 await db.saveSettings({...await db.settings(),quickCount:3});const updated=await db.snapshot();assert.equal(validateBackup(updated).settings.quickCount,3);
});
