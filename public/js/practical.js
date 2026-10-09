export const PRACTICAL_COURSES=[
 {topic:'認証',title:'認証',description:'二段階認証・パスキー・コードの扱い',symbol:'①'},
 {topic:'暗号・ハッシュ',title:'暗号・ハッシュ',description:'データの指紋・暗号化・電子署名',symbol:'②'},
 {topic:'アクセス制御',title:'アクセス制御と隔離',description:'アプリの権限・サンドボックス',symbol:'③'},
 {topic:'脆弱性対策',title:'脆弱性対策',description:'更新・マルウェア・バックアップ',symbol:'④'}
];
export const isPractical=q=>q.learningTrack==='practical';
export const questionLabel=q=>isPractical(q)?'入門・予想問題（非公式）':q.sourceType==='ai_original'?'予想問題（非公式）':'IPA公開問題';
export const questionTopics=catalog=>[...new Set(catalog.filter(q=>q.status==='active').flatMap(q=>q.topicTags))].sort((a,b)=>a.localeCompare(b,'ja'));
export function scopedQuestions(catalog,{topic='',learningTrack=''}={}){
 return catalog.filter(q=>(!topic||q.topicTags.includes(topic))&&(!learningTrack||q.learningTrack===learningTrack));
}
export function practiceCount(catalog,topic=''){
 return scopedQuestions(catalog,{topic,learningTrack:'practical'}).filter(q=>q.status==='active').length;
}
import {selectQuestions} from './core.js';
export function selectPracticalQuestions(catalog,attempts,count,pins={}){
 const bank=catalog.filter(q=>q.status==='active'&&isPractical(q)),seen=new Set(attempts.map(a=>a.questionId));
 const rank=q=>PRACTICAL_COURSES.findIndex(c=>q.topicTags.includes(c.topic))*1000+q.learningOrder;
 const fresh=bank.filter(q=>!seen.has(q.questionId)).sort((a,b)=>rank(a)-rank(b)).slice(0,count);
 const selected=new Set(fresh.map(q=>q.questionId));
 return [...fresh,...selectQuestions(bank.filter(q=>!selected.has(q.questionId)),attempts,'quick',Math.max(0,count-fresh.length),pins)];
}
