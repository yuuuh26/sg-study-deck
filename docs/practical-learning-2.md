# 実用入門②：身近な場面と専門用語

アプリ v1.5.0。2026-10-09に一次資料を確認したAIオリジナル32問（非公式）。実用入門①の次に、仕組みを身近な判断へつなげます。問題文に中心となる用語を1〜2個、回答後の用語メモに短い言い換えを入れます。第三者の人手レビューは未実施です。

| 順番 | 分野 | 学ぶ言葉の例 | 問数 |
|---|---|---|---|
| 1 | ネット・ブラウザ | TLS、Cookie、VPN、DNS、SSID | 8 |
| 2 | 詐欺・危険ファイル | フィッシング、マクロ、ディープフェイク | 8 |
| 3 | クラウド・AI | OAuth、責任共有モデル、E2EE、再識別 | 8 |
| 4 | トラブル初動 | 封じ込め、証拠保全、可用性、リスクアセスメント | 8 |

## 学び方と知識の範囲

TLSの通信保護と販売者の信用、同期とバックアップ、通信の暗号化と端末の安全など、似て見える役割を区別します。断定できないサービス依存の条件も解説へ記載。①と②のミックスは各段階の問題だけを出題します。旧問題のID・本文・revision・正解と全選択肢を変更せず、初見成績は初回回答のまま保持します。

SG Ver.4.1のネットワーク、認証、暗号、アクセス管理、クラウド、AIを悪用した攻撃、インシデント管理へ対応。OAuth、シークレットモード、E2EE、リモートワイプ等は関連知識を含み、全てがシラバスの用語例に明記されているとは扱いません。入門問題は模試の問題数には含めません。

## 全32問の根拠

| 問題ID | 分野 | 中心の用語 | 正解の根拠 |
|---|---|---|---|
| `sg-practical2-net-01` | ネット・ブラウザ | TLS | [一次資料](https://support.google.com/chrome/answer/95617?hl=ja) |
| `sg-practical2-net-02` | ネット・ブラウザ | サーバ証明書 | [一次資料](https://support.google.com/chrome/answer/95617?hl=ja) |
| `sg-practical2-net-03` | ネット・ブラウザ | Cookie | [一次資料](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) |
| `sg-practical2-net-04` | ネット・ブラウザ | シークレットモード | [一次資料](https://support.google.com/chrome/answer/95464?hl=ja) |
| `sg-practical2-net-05` | ネット・ブラウザ | VPN | [一次資料](https://csrc.nist.gov/glossary/term/virtual_private_network) |
| `sg-practical2-net-06` | ネット・ブラウザ | DNS | [一次資料](https://csrc.nist.gov/glossary/term/domain_name_server) |
| `sg-practical2-net-07` | ネット・ブラウザ | SSID | [一次資料](https://csrc.nist.gov/glossary/term/ssid) |
| `sg-practical2-net-08` | ネット・ブラウザ | ファイアウォール | [一次資料](https://csrc.nist.gov/glossary/term/firewall) |
| `sg-practical2-fraud-01` | 詐欺・危険ファイル | フィッシング | [一次資料](https://www.npa.go.jp/bureau/cyber/countermeasures/phishing.html) |
| `sg-practical2-fraud-02` | 詐欺・危険ファイル | スミッシング | [一次資料](https://www.npa.go.jp/bureau/cyber/countermeasures/phishing.html) |
| `sg-practical2-fraud-03` | 詐欺・危険ファイル | ソーシャルエンジニアリング | [一次資料](https://csrc.nist.gov/glossary/term/social_engineering) |
| `sg-practical2-fraud-04` | 詐欺・危険ファイル | ドライブバイダウンロード | [一次資料](https://www.ipa.go.jp/security/anshin/attention/2017/mgdayori20170427.html) |
| `sg-practical2-fraud-05` | 詐欺・危険ファイル | 脆弱性 | [一次資料](https://csrc.nist.gov/glossary/term/vulnerability) |
| `sg-practical2-fraud-06` | 詐欺・危険ファイル | マクロ | [一次資料](https://support.microsoft.com/en-us/office/vba/enable-or-disable-macros-in-microsoft-365-files) |
| `sg-practical2-fraud-07` | 詐欺・危険ファイル | アクセス権 | [一次資料](https://support.google.com/chrome/answer/2664769?hl=ja) |
| `sg-practical2-fraud-08` | 詐欺・危険ファイル | ディープフェイク | [一次資料](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-4.pdf) |
| `sg-practical2-cloud-01` | クラウド・AI | アクセス制御 | [一次資料](https://support.google.com/drive/answer/2494822?hl=ja) |
| `sg-practical2-cloud-02` | クラウド・AI | OAuth | [一次資料](https://datatracker.ietf.org/doc/html/rfc6749) |
| `sg-practical2-cloud-03` | クラウド・AI | 責任共有モデル | [一次資料](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility) |
| `sg-practical2-cloud-04` | クラウド・AI | 同期 | [一次資料](https://support.microsoft.com/en-us/onedrive/save-disk-space-with-onedrive-files-on-demand-for-windows) |
| `sg-practical2-cloud-05` | クラウド・AI | E2EE | [一次資料](https://proton.me/support/proton-mail-encryption-explained) |
| `sg-practical2-cloud-06` | クラウド・AI | 機密性 | [一次資料](https://csrc.nist.gov/glossary/term/confidentiality) |
| `sg-practical2-cloud-07` | クラウド・AI | 再識別 | [一次資料](https://csrc.nist.gov/pubs/sp/800/188/final) |
| `sg-practical2-cloud-08` | クラウド・AI | プロンプトインジェクション | [一次資料](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf) |
| `sg-practical2-incident-01` | トラブル初動 | セッション | [一次資料](https://support.google.com/accounts/answer/6294825?hl=en) |
| `sg-practical2-incident-02` | トラブル初動 | 封じ込め | [一次資料](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf) |
| `sg-practical2-incident-03` | トラブル初動 | 証拠保全 | [一次資料](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf) |
| `sg-practical2-incident-04` | トラブル初動 | リモートワイプ | [一次資料](https://support.google.com/accounts/answer/6160491?hl=en) |
| `sg-practical2-incident-05` | トラブル初動 | 可用性 | [一次資料](https://csrc.nist.gov/glossary/term/availability) |
| `sg-practical2-incident-06` | トラブル初動 | 完全性 | [一次資料](https://csrc.nist.gov/glossary/term/integrity) |
| `sg-practical2-incident-07` | トラブル初動 | リスクアセスメント | [一次資料](https://csrc.nist.gov/glossary/term/risk) |
| `sg-practical2-incident-08` | トラブル初動 | 再発防止 | [一次資料](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf) |

検証方法：資料の定義・機能・限界を読み、正解、全誤答の理由、用語メモと照合。場面への当てはめは独自作問です。IPAの古い記事は攻撃の定義に限り参照し、古い製品向け推奨は取り込みません。補助根拠とSG対応箇所は各JSONの `verification` / `syllabusMapping` を参照。

再生成は `python scripts/create-practical2-bank.py`。既存問題の実質変更には新しいIDを発行し、単なる修正でもrevisionを増やしてください。
