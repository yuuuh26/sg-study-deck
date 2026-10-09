# 実用から学ぶ入門コース v1.4.0

2026-10-09追加。各8問・計32問。ホームから「認証 → 暗号・ハッシュ → アクセス制御と隔離 → 脆弱性対策」の順に選べます。通常のクイックスタートにも分野選択を追加します。ユーザーの今回の追加指示を仕様v1.1へ加える変更記録です。

## 問題の位置付け

すべて独自の入門・予想問題（AI編集、非公式）。IPA問題の引用や公式解説ではありません。正解・誤答の理由を一次資料の定義と照合し、32問の正解が成立すること、選択肢が重複しないことを確認。第三者の人手レビューは未実施。各問題に根拠とSG Ver.4.1の対応項目を表示します。サンドボックスはSGシラバスの用語例に名称の明記がないため、隔離・アクセス制御・マルウェア対策の関連知識として扱います。

## 操作と記録

上の問題数設定を各入門カードにも適用。在庫数まで出題します。未回答は基本から順に進み、既出は復習に回ります。初見正答率は恒久IDの最初の回答だけで計算。「分からない」も保存し、苦手克服・復習予定・終了時の一覧・AIへの一括共有に対応。コースと分野は中断再開・結果の再プレイでも保持。一般クイックの分野設定はJSON・クラウドで復元します。

入門問題は模試へ入れず、公式のA48／B12形式を満たすための水増しに使いません。既存のIPA22問と履歴は維持。DBスキーマ・PWA ID・公開URL・認証・音楽の保存先は継続します。

## 全問題と一次資料

| 恒久ID | 分野 | 概念 | 確認資料 |
| --- | --- | --- | --- |
| `sg-practical-auth-01` | 認証 | 二要素認証 | [一次資料](https://pages.nist.gov/800-63-4/sp800-63b.html) |
| `sg-practical-auth-02` | 認証 | 二段階と二要素の違い | [一次資料](https://www.ipa.go.jp/shiken/syllabus/nl10bi0000007tch-att/syllabus_sg_ver4_1.pdf) |
| `sg-practical-auth-03` | 認証 | 認証コードとフィッシング | [一次資料](https://pages.nist.gov/800-63-4/sp800-63b.html) |
| `sg-practical-auth-04` | 認証 | パスキー | [一次資料](https://support.google.com/accounts/answer/13548313?hl=ja) |
| `sg-practical-auth-05` | 認証 | パスワードの使い回し | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |
| `sg-practical-auth-06` | 認証 | 認証と認可 | [認証](https://csrc.nist.gov/glossary/term/authentication)・[認可](https://csrc.nist.gov/glossary/term/authorization) |
| `sg-practical-auth-07` | 認証 | バックアップコード | [一次資料](https://support.google.com/accounts/answer/1187538?hl=ja) |
| `sg-practical-auth-08` | 認証 | 身に覚えのない承認要求 | [一次資料](https://support.google.com/accounts/answer/7026266?hl=ja) |
| `sg-practical-crypto-01` | 暗号・ハッシュ | ハッシュ値 | [一次資料](https://csrc.nist.gov/glossary/term/hash_function) |
| `sg-practical-crypto-02` | 暗号・ハッシュ | 同じデータとハッシュ | [一次資料](https://csrc.nist.gov/glossary/term/hash_function) |
| `sg-practical-crypto-03` | 暗号・ハッシュ | ハッシュの一致と安全性 | [一次資料](https://csrc.nist.gov/glossary/term/cryptographic_hash_function) |
| `sg-practical-crypto-04` | 暗号・ハッシュ | ハッシュの衝突 | [一次資料](https://csrc.nist.gov/glossary/term/collision_resistance) |
| `sg-practical-crypto-05` | 暗号・ハッシュ | パスワードの保存とソルト | [一次資料](https://pages.nist.gov/800-63-4/sp800-63b.html) |
| `sg-practical-crypto-06` | 暗号・ハッシュ | 共通鍵暗号 | [一次資料](https://csrc.nist.gov/glossary/term/symmetric_key_algorithm) |
| `sg-practical-crypto-07` | 暗号・ハッシュ | 公開鍵暗号 | [一次資料](https://csrc.nist.gov/glossary/term/public_key_cryptography) |
| `sg-practical-crypto-08` | 暗号・ハッシュ | 電子署名 | [一次資料](https://csrc.nist.gov/glossary/term/digital_signature) |
| `sg-practical-access-01` | アクセス制御 | 最小権限 | [一次資料](https://www.ipa.go.jp/shiken/syllabus/nl10bi0000007tch-att/syllabus_sg_ver4_1.pdf) |
| `sg-practical-access-02` | アクセス制御 | Androidのアプリ隔離 | [一次資料](https://source.android.com/docs/security/app-sandbox) |
| `sg-practical-access-03` | アクセス制御 | サンドボックスの目的 | [一次資料](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/) |
| `sg-practical-access-04` | アクセス制御 | 隔離と情報入力 | [一次資料](https://pages.nist.gov/800-63-4/sp800-63b.html) |
| `sg-practical-access-05` | アクセス制御 | サンドボックスの共有範囲 | [一次資料](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file) |
| `sg-practical-access-06` | アクセス制御 | 共有リンクの権限 | [一次資料](https://www.ipa.go.jp/shiken/syllabus/nl10bi0000007tch-att/syllabus_sg_ver4_1.pdf) |
| `sg-practical-access-07` | アクセス制御 | 不要になった権限 | [一次資料](https://www.ipa.go.jp/shiken/syllabus/nl10bi0000007tch-att/syllabus_sg_ver4_1.pdf) |
| `sg-practical-access-08` | アクセス制御 | 隔離環境の終了 | [一次資料](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/) |
| `sg-practical-vuln-01` | 脆弱性対策 | セキュリティ更新 | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |
| `sg-practical-vuln-02` | 脆弱性対策 | ファイルの見た目と安全性 | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |
| `sg-practical-vuln-03` | 脆弱性対策 | ゼロデイ攻撃 | [一次資料](https://csrc.nist.gov/glossary/term/zero_day_attack) |
| `sg-practical-vuln-04` | 脆弱性対策 | 多層防御 | [一次資料](https://www.ipa.go.jp/shiken/syllabus/nl10bi0000007tch-att/syllabus_sg_ver4_1.pdf) |
| `sg-practical-vuln-05` | 脆弱性対策 | ランサムウェアへの備え | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |
| `sg-practical-vuln-06` | 脆弱性対策 | 不審な更新案内 | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |
| `sg-practical-vuln-07` | 脆弱性対策 | サポート終了 | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |
| `sg-practical-vuln-08` | 脆弱性対策 | 3-2-1バックアップ | [一次資料](https://www.ipa.go.jp/security/anshin/measures/everyday.html) |

[SGシラバス Ver.4.1](https://www.ipa.go.jp/shiken/syllabus/nl10bi0000007tch-att/syllabus_sg_ver4_1.pdf)で試験の対応範囲を照合。NIST SP 800-63B-4、NIST用語集、Googleの公式ヘルプ、Android Open Source Project、Microsoft Learn、IPAの日常対策資料で各概念を確認。
