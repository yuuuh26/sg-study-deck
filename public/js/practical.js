export const PRACTICAL_SETS=[
 {id:1,title:'実用入門① · 仕組みの基礎',description:'認証 → 暗号・ハッシュ → 権限と隔離 → 脆弱性対策。身近な道具の仕組みから。'},
 {id:2,title:'実用入門② · 身近な場面で判断',description:'ネット → 詐欺・危険ファイル → クラウド・AI → トラブル初動。専門用語を場面と結び付け、解説の用語メモでおさらい。'}
];
export const PRACTICAL_COURSES=[
 {set:1,topic:'認証',title:'認証',description:'二段階認証・パスキー・コードの扱い',symbol:'①'},
 {set:1,topic:'暗号・ハッシュ',title:'暗号・ハッシュ',description:'データの指紋・暗号化・電子署名',symbol:'②'},
 {set:1,topic:'アクセス制御',title:'アクセス制御と隔離',description:'アプリの権限・サンドボックス',symbol:'③'},
 {set:1,topic:'脆弱性対策',title:'脆弱性対策',description:'更新・マルウェア・バックアップ',symbol:'④'},
 {set:2,topic:'ネット・ブラウザ',title:'ネット・ブラウザ',description:'TLS・Cookie・VPNと通信の安全',symbol:'①'},
 {set:2,topic:'詐欺・危険ファイル',title:'詐欺・危険ファイル',description:'フィッシング・マクロ・偽の音声',symbol:'②'},
 {set:2,topic:'クラウド・AI',title:'クラウド・AI',description:'共有・OAuth・AIへ渡す情報',symbol:'③'},
 {set:2,topic:'トラブル初動',title:'トラブル初動',description:'封じ込め・証拠保全・復旧',symbol:'④'}
];
export const isPractical=q=>q.learningTrack==='practical';
// First-generation packs/sessions have no practicalSet. Their IDs and records stay intact.
export const practicalSetOf=q=>isPractical(q)?q.practicalSet||1:0;
export const practicalSetLabel=set=>set===2?'実用入門②':'実用入門①';
export const questionLabel=q=>isPractical(q)?practicalSetLabel(practicalSetOf(q))+'（非公式）':q.sourceType==='ai_original'?'予想問題（非公式）':'IPA公開問題';
export const questionTopics=catalog=>[...new Set(catalog.filter(q=>q.status==='active').flatMap(q=>q.topicTags))].sort((a,b)=>a.localeCompare(b,'ja'));
export function scopedQuestions(catalog,{topic='',learningTrack='',practicalSet=0}={}){
 return catalog.filter(q=>(!topic||q.topicTags.includes(topic))&&(!learningTrack||q.learningTrack===learningTrack)&&(!practicalSet||practicalSetOf(q)===practicalSet));
}
export function practiceCount(catalog,topic='',practicalSet=0){
 return scopedQuestions(catalog,{topic,learningTrack:'practical',practicalSet}).filter(q=>q.status==='active').length;
}
import {selectQuestions} from './core.js';
export function selectPracticalQuestions(catalog,attempts,count,pins={}){
 const bank=catalog.filter(q=>q.status==='active'&&isPractical(q)),seen=new Set(attempts.map(a=>a.questionId));
 const rank=q=>PRACTICAL_COURSES.findIndex(c=>q.topicTags.includes(c.topic))*1000+q.learningOrder;
 const fresh=bank.filter(q=>!seen.has(q.questionId)).sort((a,b)=>rank(a)-rank(b)).slice(0,count);
 const selected=new Set(fresh.map(q=>q.questionId));
 return [...fresh,...selectQuestions(bank.filter(q=>!selected.has(q.questionId)),attempts,'quick',Math.max(0,count-fresh.length),pins)];
}
