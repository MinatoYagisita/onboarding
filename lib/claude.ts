import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "./db";
import { AiUnavailableError } from "./errors";

// ─── Provider setup ───────────────────────────────────────────────────────────
// API キーは組織ごとに Secrets Manager で管理する。グローバルシングルトンは持たない。

// ─── Tool definitions ─────────────────────────────────────────────────────────

const groqTools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "answer",
      description: "組織の資料・FAQに基づいて質問に回答する",
      parameters: {
        type: "object",
        properties: {
          conclusion: { type: "string", description: "結論（1〜2文）" },
          evidence: { type: "string", description: "根拠となる規則・条文" },
          supplement: { type: "string", description: "補足情報（任意）" },
          caution: { type: "string", description: "注意点（任意）" },
          contact: { type: "string", description: "相談先" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                section: { type: "string" },
                documentId: { type: "string" },
              },
              required: ["title"],
            },
            description: "回答の出典",
          },
          matchedFaqId: {
            type: ["string", "null"],
            description: "マッチしたFAQのID。該当するFAQがなければ null",
          },
        },
        required: ["conclusion", "evidence", "contact", "sources"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "not_found",
      description: "資料の中に回答が見つからなかった場合に呼び出す",
      parameters: {
        type: "object",
        properties: {
          relatedFaqIds: {
            type: "array",
            items: { type: "string" },
            description: "関連するFAQのIDリスト（最大3件）",
          },
        },
        required: ["relatedFaqIds"],
      },
    },
  },
];

const anthropicTools: Anthropic.Tool[] = [
  {
    name: "answer",
    description: "組織の資料・FAQに基づいて質問に回答する",
    input_schema: {
      type: "object",
      properties: {
        conclusion: { type: "string", description: "結論（1〜2文）" },
        evidence: { type: "string", description: "根拠となる規則・条文" },
        supplement: { type: "string", description: "補足情報（任意）" },
        caution: { type: "string", description: "注意点（任意）" },
        contact: { type: "string", description: "相談先" },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              section: { type: "string" },
              documentId: { type: "string" },
            },
            required: ["title"],
          },
          description: "回答の出典",
        },
        matchedFaqId: {
          type: ["string", "null"],
          description: "マッチしたFAQのID。該当するFAQがなければ null",
        },
      },
      required: ["conclusion", "evidence", "contact", "sources"],
    },
  },
  {
    name: "not_found",
    description: "資料の中に回答が見つからなかった場合に呼び出す",
    input_schema: {
      type: "object",
      properties: {
        relatedFaqIds: {
          type: "array",
          items: { type: "string" },
          description: "関連するFAQのIDリスト（最大3件）",
        },
      },
      required: ["relatedFaqIds"],
    },
  },
];

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const AnswerInputSchema = z.object({
  conclusion: z.string(),
  evidence: z.string(),
  supplement: z.string().nullish(),
  caution: z.string().nullish(),
  contact: z.string(),
  sources: z.array(
    z.object({
      title: z.string(),
      section: z.string().nullish(),
      documentId: z.string().nullish(),
    })
  ),
  matchedFaqId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "null" || v == null ? null : v)),
});

const NotFoundInputSchema = z.object({
  relatedFaqIds: z.array(z.string()),
});

export type ClaudeAnswer = z.infer<typeof AnswerInputSchema>;

export type ClaudeResult =
  | { kind: "answer"; answer: ClaudeAnswer }
  | { kind: "not-found"; relatedFaqIds: string[] };

// ─── System prompt builder ────────────────────────────────────────────────────

export async function buildSystemPrompt(
  organizationId: string,
  orgName: string
): Promise<string> {
  const [faqs, documents] = await Promise.all([
    db.faq.findMany({
      where: { organizationId, isPublished: true, deletedAt: null },
      orderBy: { askedCount: "desc" },
    }).catch(() => []),
    db.document.findMany({
      where: { organizationId, deletedAt: null, content: { not: null } },
      select: { id: true, title: true, content: true },
    }).catch((err) => { console.error("[buildSystemPrompt] document query failed:", err?.message ?? err); return [] as { id: string; title: string; content: string | null }[]; }),
  ]);

  const faqSection =
    faqs.length > 0
      ? `## FAQ一覧\n${JSON.stringify(
          faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
          null,
          2
        )}`
      : "## FAQ一覧\n（登録されているFAQはありません）";

  const docSection =
    documents.length > 0
      ? `## 資料\n${documents
          .map((d) => `### ${d.title}\n${d.content}`)
          .join("\n\n")}`
      : "";

  return `あなたは${orgName}の社内Q&Aアシスタントです。
新入社員やアルバイトスタッフからの質問に、以下の資料に基づいて回答してください。

【重要】必ず日本語のみで回答してください。中国語・英語など日本語以外の文字を絶対に使わないでください。すべてのフィールド（conclusion・evidence・supplement・caution・contact）は日本語で記述してください。

回答ルール:
- 必ず answer または not_found 関数を呼び出して回答する
- 資料に記載のない内容は回答しない（想像で補わない）
- 回答が見つからない場合は not_found を呼び出し、関連しそうなFAQのIDを最大3件返す
- matchedFaqId は、FAQの質問と実質的に一致する場合のみそのFAQのIDを返す（それ以外はnull）

${faqSection}${docSection ? `\n\n${docSection}` : ""}`;
}

// ─── AI callers ───────────────────────────────────────────────────────────────

type HistoryTurn = { question: string; result: ClaudeResult };

async function callWithGroq(client: Groq, systemPrompt: string, userContent: string): Promise<ClaudeResult> {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: groqTools,
    tool_choice: "required",
  });

  const toolCalls = response.choices[0]?.message?.tool_calls;
  if (!toolCalls || toolCalls.length === 0) throw new Error("No function call in response");

  const call = toolCalls[0];
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(call.function.arguments);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${call.function.arguments.slice(0, 100)}`);
  }
  return parseToolCall(call.function.name, args);
}

async function callWithClaude(client: Anthropic, systemPrompt: string, userContent: string): Promise<ClaudeResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    tools: anthropicTools,
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("No tool use in response");

  return parseToolCall(toolUse.name, toolUse.input as Record<string, unknown>);
}

function parseToolCall(name: string, args: Record<string, unknown>): ClaudeResult {
  if (name === "answer") {
    const parsed = AnswerInputSchema.safeParse(args);
    if (!parsed.success) throw new Error(`Invalid answer schema: ${parsed.error.message}`);
    return { kind: "answer", answer: parsed.data };
  }
  if (name === "not_found") {
    const parsed = NotFoundInputSchema.safeParse(args);
    if (!parsed.success) return { kind: "not-found", relatedFaqIds: [] };
    return { kind: "not-found", relatedFaqIds: parsed.data.relatedFaqIds };
  }
  throw new Error(`Unknown function: ${name}`);
}

export async function askClaude(
  systemPrompt: string,
  question: string,
  history: HistoryTurn[] = [],
  orgApiKey: { provider: string; apiKey: string } | null,
): Promise<ClaudeResult> {
  if (!orgApiKey) {
    throw new AiUnavailableError({
      provider: "unknown",
      attempts: 0,
      cause: "API キーが設定されていません。管理画面から組織の API キーを登録してください。",
    });
  }

  let userContent = question;

  if (history.length > 0) {
    const historyText = history
      .map((t) =>
        t.result.kind === "answer"
          ? `Q: ${t.question}\nA: ${t.result.answer.conclusion}`
          : `Q: ${t.question}\nA: 回答が見つかりませんでした`
      )
      .join("\n\n");
    userContent = `[会話履歴]\n${historyText}\n\n[新しい質問]\n${question}`;
  }

  const effectiveProvider = (orgApiKey.provider ?? "") as "groq" | "claude";

  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (effectiveProvider === "claude") {
        const client = new Anthropic({ apiKey: orgApiKey.apiKey });
        return await callWithClaude(client, systemPrompt, userContent);
      } else {
        const client = new Groq({ apiKey: orgApiKey.apiKey });
        return await callWithGroq(client, systemPrompt, userContent);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new AiUnavailableError({
    provider: effectiveProvider,
    attempts: MAX_ATTEMPTS,
    cause: lastErr instanceof Error ? lastErr.message : String(lastErr),
  });
}
