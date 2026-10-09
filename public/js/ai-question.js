// Only the selected question and its answer are exported; no account or learning-history data.
export function aiQuestionPrompt(q,attempt=null){
 const options=q.options.map(o=>`${o.id}：${o.text}`).join('\n');
 const selected=q.options.find(o=>o.id===attempt?.selectedOptionId);
 const correct=q.options.find(o=>o.id===q.correctOptionId);
 const reasons=q.options.map(o=>`${o.id}：${q.optionExplanations?.[o.id]||'解説なし'}`).join('\n');
 const myAnswer=selected?`${selected.id}：${selected.text}（${selected.id===q.correctOptionId?'正解しましたが、理解を深めたいです':'不正解でした'}）`:'この問題の回答記録はありません。基礎から理解したいです。';
 return `情報セキュリティマネジメント試験の、次の問題を詳しく教えてください。
私は初学者の大人です。専門用語が分からなくても理解できるよう、日本語で説明してください。

【説明してほしいこと】
1. まず「何を問う問題か」と「正解になる理由」を短く説明してください。
2. 5歳の子でもイメージできる、身近なたとえで説明してください。幼児向けの口調は不要です。たとえの各要素が実際の何に対応するか、たとえでは説明しきれない点も示してください。
3. 用語を一つずつかみ砕き、その後に試験で必要な正確な意味を説明してください。
4. 登場人物・情報・処理の流れや関係を、簡単な図で示してください。図を表示できる場合は図解し、できない場合は矢印や比較表を使ってください。図の読み方も説明してください。
5. 全選択肢について、正しい／誤っている理由と、似た用語との違いを比較してください。私が不正解の場合は、選んだ答えのどこが紛らわしいかを特に詳しく教えてください。私の考え方は推測と断定せず、必要なら質問してください。
6. 最後に「これだけは覚える」要点を3つと、覚え方を示してください。理解を確認する短い問題を1問出し、その答えは私の回答を待ってください。
提示した解説を丸写しせず、初学者向けに説明を補ってください。技術的な正確さを保ち、断定できない点は明示してください。正解・解説に疑問があれば出典で確認し、根拠とともに指摘してください。

【問題】
${q.stem}

【選択肢】
${options}

【私の回答】
${myAnswer}

【収録されている正解】
${q.correctOptionId}：${correct?.text||''}

【アプリの解説】
${q.explanation}

【各選択肢の解説】
${reasons}

【問題の情報・出典】
問題ID：${q.questionId} / revision ${q.revision}
分野：${(q.topicTags||[]).join('、')}
${q.sourceType==='ai_original'?'AIオリジナル予想問題（非公式）':`${q.sourceYear}年度 ${q.sourceExam} 科目${q.subject} 問${q.sourceNumber}`}
原典：${q.sourceUrl||'なし'}
正解の根拠：${q.verification?.evidenceUrl||'なし'}${q.modificationNote?'\n改変の注記：'+q.modificationNote:''}${q.versionNote?'\n版の注記：'+q.versionNote:''}`;
}
