# 問題データの追加・検証

`public/data/ipa-verified.json` が独立した初期パックです。UIコードへ問題を埋め込みません。2025・2026年の問1〜6、8〜12を採用し、問7と科目B、旧年度問題は現時点で収録していません。

原典一覧 https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/index.html と年度別の問題・公式解答PDFを取得し、公式解答と採用22問の正解を独立テストで照合。表・図の文章化をした問題は本文と改変表示に記録しています。CVSS v3、平成28年の管理基準など、問題が指定した版を明示し、最新版の一般論と混同しません。

解説はアプリ独自編集です。公式解説ではありません。全選択肢の理由と検証根拠URLを持ちます。未検証問題を `active` にしない運用と、読み込み時の必須属性検査を併用します。検証済み属性は人の内容確認を代替するものではありません。

## 恒久IDと改訂

- IPA問題は年度・科目・問番号を含む恒久ID。AIオリジナル問題は別名前空間を使います。
- 単なる誤字修正などはrevisionを増やします。問題文の意味・正解・選択肢の実質変更には新IDを発行します。
- 現在も正しい知識かの更新日（contentUpdatedAt）、根拠、検証方法、出典、改変表示を残します。旧年度を再採用するときは改めて検証します。
- 重複ID、選択肢IDの重複、欠けた全選択肢解説、不正な出典URL、未検証の採用問題、同一revisionでの変更は読み込みエラーにします。
- 問題廃止はstatusを `retired` にし、履歴は残します。

## 形式

JSONの最上位は `formatVersion: 1` と `questions` 配列です。各問題の実例は初期パックを参照してください。

| 属性 | 意味 |
|---|---|
| questionId / revision / status | 恒久ID、改訂番号、active / review_needed / retired |
| subject / topicTags / difficulty | A/B、分野タグ、難易度1〜5 |
| stem / options / correctOptionId | 問題文、4〜20個の選択肢、正解ID |
| explanation / optionExplanations | 全体解説、各選択肢の理由 |
| sourceType / sourceYear / sourceExam / sourceNumber / sourceUrl | IPA公開・公式サンプル・AIオリジナルの識別と出典 |
| verification | answerChecked、explanationChecked、method、evidenceUrl |
| modificationNote / versionNote | 改変と対象となる版 |

採用パックは問題画面の管理欄からJSONで追加できます。数百〜1,000問以上でもIDを維持する限り履歴を引き継ぎます。30問・100問・1,000問のテストデータ追加後の保持はテスト済み。1,000問実データでの実機性能確認は未実施です。

`scripts/create-question-bank.py` は初期作成に使ったスクリプトです。再生成には原典PDFを別途取得し、`pdftotext -layout` の結果をプロジェクト親の `sources/2025.txt` / `2026.txt` へ配置する必要があります。生成後には原典・正解・全解説を再確認し、`npm test` を実行してください。
