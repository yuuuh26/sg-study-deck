# SG Study Deck 検証報告

実施日：2026-10-09。アプリ v1.0.0 / 実装仕様 v1.1。

公開URL: https://sg-study-deck.dengana-10011212.workers.dev/

GitHub: https://github.com/yuuuh26/sg-study-deck

Notion正本v1.1、APP-SPEC現行v1.7、APP-CLOUD-BACKUP現行v1.0を通読して適用しました。

## 結果

| 確認 | 結果 | 証拠・範囲 |
|---|---|---|
| 基本・ストレージ・API・送信制御 | 合格 | Nodeテスト30件、失敗0 |
| スマートフォンUI | 合格 | Chromiumの390px/360px幅、21項目、ページエラー0。公開URLでも5項目を確認 |
| 公開環境 | 合格 | HTTPS/PWA配信、認証、実D1の6世代保存・再取得・最新5件、ログアウトの5項目。公開ブラウザからの保存・復元・退避・ログアウトも確認 |
| 3テーマ・正解・コンボ | 合格 | 回転背景、ボスHP、シールド、粒子・衝撃波、5/10/20コンボ |
| BGM | 合格 | 2曲追加、クロスフェード、急な連続選曲、10問継続、2.5秒フェード、独立音量、再読込後オフライン再生 |
| 初見と苦手 | 合格 | 初回誤答→復習正解でも初見成績不変、未回答のみ、苦手70/関連20/確認10の選択、重複回避 |
| 問題追加 | 合格 | 30/100/1,000問の追加後も回答と初見集計保持。追加分は試験専用データ |
| 即時保存 | 合格 | 連続タップの重複排除、100回答のオフライン保存・再起動、容量エラー時の停止と再試行 |
| クラウド保存 | 合格 | 48時間・無変更抑制、失敗後の同一操作再送、送信中の変更保持、競合停止、5世代の検証後整理 |
| 復元 | 合格 | UIの確認・復元・退避、変更番号ガード、原子的置換、音源Blob保持。公開APIからも完全JSONを再取得してハッシュ照合。公開URLのブラウザから確認画面を経て復元・退避を確認 |
| 認証・アクセス制御 | 合格 | 未認証401、異なるOrigin403、専用HttpOnly/Secure/Strict Cookie、取消・全取消・キー変更、認証回数制限 |
| PWA | 合格 | 固有manifest ID、standalone、start_url/scope、PNG192/512/maskable、オフラインSW、APIキャッシュ除外、noindex |
| 本番形式の仕組み | 合格 | 試験用A48/B12を出題、120分、プレイ中の答え合わせ非表示、時間切れ終了、結果解説 |
| 本番形式の公開問題 | 未充足 | 初期パックA22/B0。必要数に達するまでモード開始を停止 |
| GitHub反映 | 完了 | yuuuh26/sg-study-deck のmainへソース・問題データ・テスト・文書37ファイルを反映。Git blob SHAをローカルと全件照合 |
| Android実機 | 未確認 | 実機インストール、振動、端末の音声機器・実際のMP3等の聴感 |

`npm test`、`npm run check`、`npm run build`、ブラウザテストを実行。公開用Workerは約519KB。ソースに復旧キー・端末トークン・音源を含めない検査を実施しました。

公開環境の検証で生成したバックアップと検証端末は、そのIDを指定して削除し、初期の空状態へ戻しています。アプリ専用認証設定は保持しています。

## ブラウザの確認項目

- 390px home, no overflow, service worker ready
- neon: correct effects, no duplicate taps, saved answer
- boss: correct effects, no duplicate taps, saved answer
- cyber: correct effects, no duplicate taps, saved answer
- multiple audio import, separate persistent blobs
- smooth GainNode crossfade
- independent BGM and SFX volume
- HttpOnly cookie login, upload and readback verification
- cloud restore creates safety copy
- BGM continues across 10 questions and fades for 2.5s
- day, week, month statistics
- mock safely blocked until correct composition exists
- 100 offline IndexedDB answers survive reload
- audio survives reload and plays offline
- 5, 10 and 20 combo special effects
- reduced motion respects system setting
- rapid music changes resolve to continuous playback
- first challenge draws unseen questions; wrong answers show explanations and wait
- 360px minimum mobile width has no horizontal overflow
- failed IndexedDB transaction blocks progression; retry commits once
- mock uses A48 B12 and 120min; immediate grading hidden and expiry shows review

## 公開環境の確認項目

- Public HTTPS assets and PWA manifest/icons are reachable with security headers
- Unauthenticated backup access is denied
- Production app-specific Secure HttpOnly cookie and D1 authentication work
- Six real D1 generations: readback hashes, idempotent retries and newest-five retention verified
- Production device logout immediately revokes access

## 使い始める・残る操作

Android Chromeで公開URLを開き、設定のクラウドバックアップへ別ファイルの専用復旧キーを貼り付けます。キーは初回接続と管理操作にだけ使用します。音源は設定から追加できます。

GitHubへのソース反映とCloudflareへの公開は完了しています。アプリ情報からGitHubへ移動し、URLをコピーできます。認証Cookieと端末保存領域を維持するため、引き続き上記のCloudflare URLで利用してください。

初期収録22問はIPA公式解答と照合。古い2016〜2019年、未検証問題、AI予想問題は未収録です。科目BとAの追加が必要です。模試を有効にするためだけの未検証問題は収録していません。

画像添付パックはv1では未対応。表・図の文章化と改変表示に対応。活動時間はセッション開始日に集計。1,000問の実データとAndroid実機での性能確認は未実施です。

BGMの急停止を抑えるフェードとクロスフェードは検証済みですが、ブラウザ/OSによる強制停止や、アプリを閉じた状態の連続再生・定時バックアップは保証対象外です。

## 公開URLのブラウザ操作

- Final deployed app boots in a mobile Chromium browser
- Live theme, answer effects and immediate IndexedDB saving work
- Live browser Secure HttpOnly cookie saves to real D1
- Live D1 restore via confirmation UI retains the old study record in a safety copy
- Live browser logout revokes its device
