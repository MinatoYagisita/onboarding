# 検索設計

## 方針

**MVP: Full context + プロンプトキャッシュ**
**スケール時: RAG（ベクトル検索）へ移行**

---

## MVP の設計

### faqs と documents の役割分担

| ソース | 内容 | Claudeへの渡し方 |
|---|---|---|
| `faqs` | 管理者が手動で作成したQ&A（精度が高い） | 全件をシステムプロンプトに含める |
| `documents` | アップロードされた規約・マニュアル（生のテキスト） | 全文をシステムプロンプトに含める |

Claudeは両方を参照して回答する。FAQに該当する質問があればFAQを優先し、`matchedFaqId` を返す。なければドキュメントから生成し `matchedFaqId` は null。

### プロンプトキャッシュの適用

Anthropic SDK のプロンプトキャッシュを使い、組織ごとのシステムプロンプト（FAQ全件 + 資料全文）をキャッシュする。キャッシュヒット時のトークンコストは約90%削減。

```
[キャッシュ対象・組織ごとに固定]
  system: |
    あなたは {orgName} の社内Q&Aアシスタントです。
    以下の資料に基づいて回答してください。

    ## FAQ一覧
    [{id: "faq_01", question: "...", answer: {...}}, ...]

    ## 資料
    [就業規則.pdf の全文テキスト]
    [勤怠マニュアル.pdf の全文テキスト]

    ## 回答フォーマット（必ずJSONで返すこと）
    {
      "conclusion": "結論を1〜2文で",
      "evidence": "根拠となる規則・条文",
      "supplement": "補足（任意）",
      "caution": "注意点（任意）",
      "contact": "相談先",
      "sources": [{"title": "...", "section": "...", "documentId": "..."}],
      "matchedFaqId": "faq_01 or null"
    }

[毎回送信・キャッシュ対象外]
  user: "有給はいつから取れますか？"
  （追加質問の場合）会話履歴の直近N件
```

### Answer型の構造化レスポンス強制

Claudeに必ず上記JSONフォーマットで返させるために：
1. システムプロンプトにフォーマット指示を入れる
2. Anthropic SDK の `tool_use` 機能でスキーマを強制する（推奨）
3. アプリ層で Zod によるバリデーションをかけ、不正な場合はエラーを返す

### matchedFaqId による asked_count 更新

```
POST /api/search
  → Claudeが matchedFaqId を返す
  → matchedFaqId が null でなければ faqs.asked_count を +1（アプリ層で更新）
  → chat_turns に INSERT
  → matchedFaqId が null の場合は unanswered_questions に UPSERT
```

---

## RAG への移行タイミング

以下のいずれかを満たしたとき移行を検討する：

| 基準 | 目安 |
|---|---|
| 単一組織の資料総ページ数 | 500ページ超 |
| コンテキストウィンドウ使用率 | 70%超 |
| 1リクエストのレイテンシ | 10秒超 |

### RAG の概要（移行後）

```
資料アップロード時:
  PDF → テキスト抽出 → チャンク分割（500〜1000トークン）
  → 埋め込みベクトル生成（text-embedding-3-small 等）
  → pgvector に保存

検索時:
  質問文 → ベクトル化
  → pgvector で近傍チャンク上位5件を取得
  → そのチャンクだけをClaudeに渡す
```

### MVP で対応する資料フォーマット

| フォーマット | MVP | 将来 |
|---|---|---|
| PDF | 対応 | 対応 |
| プレーンテキスト（.txt） | 対応 | 対応 |
| Word（.docx） | 非対応 | 対応予定 |
| Excel（.xlsx） | 非対応 | 対応予定 |
| 画像（スキャンPDF） | 非対応 | 要検討 |
