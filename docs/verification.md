# SG Study Deck 検証報告

実施日：2026-10-09。アプリ v1.3.0 / 実装仕様 v1.1。

公開URL: https://sg-study-deck.dengana-10011212.workers.dev/

GitHub: https://github.com/yuuuh26/sg-study-deck

Notion正本v1.1、APP-SPEC現行v1.7、APP-CLOUD-BACKUP現行v1.0を通読して適用しました。

## 結果

| 確認 | 結果 | 証拠・範囲 |
|---|---|---|
| 基本・ストレージ・API・送信制御 | 合格 | Nodeテスト44件、失敗0 |
| スマートフォンUI | 合格 | Chromiumの390px/360px幅、既存ゲーム21項目＋読み上げ7項目＋AI質問文6項目＋新学習操作8項目、ページエラー0。初回公開URLでも5項目を確認 |
| 公開環境 | 合格 | HTTPS/PWA配信、認証、実D1の6世代保存・再取得・最新5件、ログアウトの5項目。公開ブラウザからの保存・復元・退避・ログアウトも確認 |
| 3テーマ・正解・コンボ | 合格 | 回転背景、ボスHP、シールド、粒子・衝撃波、5/10/20コンボ |
| BGM | 合格 | 2曲追加、クロスフェード、急な連続選曲、10問継続、2.5秒フェード、独立音量、再読込後オフライン再生 |
| 読み上げ | 合格 | 制御した日本語TTSによる7項目のUI検証。本文/4択、速度・音量、手動/自動、回答・中断・非表示・ホームで停止、3テーマ、BGM継続/音量復帰、設定/履歴保持、オフラインのコード配信、音声非対応時の案内。Androidの実際の音声と発音は未確認 |
| 初見と苦手 | 合格 | 初回誤答→復習正解でも初見成績不変、未回答のみ、苦手70/関連20/確認10の選択、重複回避 |
| 問題追加 | 合格 | 30/100/1,000問の追加後も回答と初見集計保持。追加分は試験専用データ |
| 即時保存 | 合格 | 連続タップの重複排除、100回答のオフライン保存・再起動、容量エラー時の停止と再試行 |
| クラウド保存 | 合格 | 48時間・無変更抑制、失敗後の同一操作再送、送信中の変更保持、競合停止、5世代の検証後整理 |
| 復元 | 合格 | UIの確認・復元・退避、変更番号ガード、原子的置換、音源Blob保持。公開APIからも完全JSONを再取得してハッシュ照合。公開URLのブラウザから確認画面を経て復元・退避を確認 |
| 認証・アクセス制御 | 合格 | 未認証401、異なるOrigin403、専用HttpOnly/Secure/Strict Cookie、取消・全取消・キー変更、認証回数制限 |
| PWA | 合格 | 固有manifest ID、standalone、start_url/scope、PNG192/512/maskable、オフラインSW、APIキャッシュ除外、noindex |
| 本番形式の仕組み | 合格 | 試験用A48/B12を出題、120分、プレイ中の答え合わせ非表示、時間切れ終了、結果解説 |
| 本番形式の公開問題 | 未充足 | 初期パックA22/B0。必要数に達するまでモード開始を停止 |
| GitHub反映 | 完了 | yuuuh26/sg-study-deck のmainへソース・問題データ・テスト・文書44ファイルを反映。Git blob SHAをローカルと全件照合 |
| Android実機 | 未確認 | 実機インストール、振動、端末の音声機器・実際のMP3等の聴感 |

GitHub反映後の公開更新でも、リンクとURLコピー、回答の再読込後の保持、サービスワーカーによるオフライン起動を確認しました。ホームの回転リングがスマホ画面の横幅を広げないよう、描画を表示枠に収めています。

`npm test`、`npm run check`、`npm run build`、ブラウザテストを実行。公開用Workerは約553KB。ソースに復旧キー・端末トークン・音源を含めない検査を実施しました。

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

## v1.1.0 読み上げの追加

問題文と選択肢だけを読み上げ、正解・解説は読み上げません。長い文章は区切って読み、取消後の古い完了通知が次の問題を読まないよう保護しています。日本語の端末音声を優先し、音声の初期化・利用不可・ミュート・再生失敗時は画面を操作できる状態へ戻します。

旧バージョンの設定へ追加項目の初期値を補う際に、学習履歴・音源・未送信の変更番号を書き換えないことを確認しました。JSON/クラウドの設定検証にも読み上げ設定を追加し、従来のバックアップを読み込めます。

読み上げのUI検証は音声APIの入力・イベントとWeb AudioのBGM再生を確認するものです。Android実機の声質、専門用語の発音、端末音声のオフライン利用は端末側での最終確認が必要です。

## v1.2.0 AIへの質問文の追加

- 誤答後の問題全文・全選択肢・誤答・正解・解説・出典が、実際のクリップボードへ欠落なくコピーされることを確認。
- コピー権限拒否時も質問文を保持し、全文選択で手動コピーできることを確認。
- 正解後に開いたときは自動進行が停止。360px幅、3テーマ、44px以上のコピー操作とホバー時の可読性を確認。
- 通常プレイの結果と復習一覧から、対象の誤答を含む質問文を取り出せることを確認。
- 未回答の問題は未回答と明記。再読み込み後の履歴保持と、オフラインでの質問文生成を確認。
- 模試のプレイ中は答えを含む機能を隠し、終了後のみ利用できることを確認。

Node38件と既存ゲーム21項目・読み上げ7項目を再実行。質問文を開く／コピーする操作で回答履歴・設定・未送信変更番号が更新されず、AIへ自動通信しないことを確認。質問文を貼り付けた後のAIの回答品質は、本アプリの検証対象外です。

## v1.3.0 問数選択・分からない・一括共有

- 初期5問、ホーム/設定の問数指定、3問での開始、開始連打の排除を検証。
- 分からない回答の保存失敗→再試行、重複保存排除、手動進行、初見の未正解を保持する集計と重点復習を検証。
- 個別AIボタンがクリックの有効状態を保って直接共有を呼び出し、分からないという回答も含むことを検証。
- 最後の一覧で誤答と分からないを確認でき、各問題の全選択肢・回答・正解・解説・出典を一括共有できることを検証。
- 共有キャンセル・共有中の連打は記録を変更せず、共有失敗時は欠落なくコピーへ切り替わることを検証。
- 直近の保存済み結果をホームから再表示。3テーマの360px表示と44px以上の操作領域を検証。
- 再読み込み後も問数・履歴を保持。100問指定は実収録22問まで、未正解0件の共有を非表示、オフラインでも保存済み一覧と質問文が動作することを検証。
- 読み上げの「選択肢」を削除。記号と本文の400ms間隔、間の途中で停止した際に古い本文を読まないこと、BGM音量抑制の維持を検証。

Nodeテスト44件（元の38件、新規6件）を確認。分からない回答と問数設定を認証付きAPI・D1テストDBへ保存・再取得し、安全退避を伴うクラウド復元で復元できることを追加確認しました。本番の既存学習データ・音源・認証を変更する検証は実施していません。

共有は制御したWeb Share APIで、渡す文章、クリックによる有効状態、成功・取消・失敗を確認しています。Android実機のOS共有画面や共有先アプリの表示は、この実行環境では確認できません。
