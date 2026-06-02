import { db } from "./db";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Slack mrkdwn では & < > がリンク/メンションとして解釈されるためエスケープする
function escapeMrkdwn(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type EscalationPayload = {
  orgName: string;
  question: string;
  senderName: string;
  message: string;
};

type UnansweredPayload = {
  orgName: string;
  question: string;
};

async function getEnabledChannels(organizationId: string, type: "slack" | "email") {
  return db.notificationChannel.findMany({
    where: { organizationId, type, enabled: true },
  });
}

// ─── Slack ───────────────────────────────────────────────────────

async function postToSlack(webhookUrl: string, blocks: unknown[], fallbackText: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: fallbackText, blocks }),
  });
  if (!res.ok) {
    console.error(`[notify] Slack webhook failed: ${res.status} ${webhookUrl.slice(0, 50)}`);
  }
}

function escalationBlocks(payload: EscalationPayload) {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "📨 担当者への相談が届きました", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*組織*\n${escapeMrkdwn(payload.orgName)}` },
        { type: "mrkdwn", text: `*送信者*\n${escapeMrkdwn(payload.senderName)}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*元の質問*\n${escapeMrkdwn(payload.question)}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*相談内容*\n${escapeMrkdwn(payload.message)}` },
    },
    { type: "divider" },
  ];
}

function unansweredBlocks(payload: UnansweredPayload) {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "❓ 回答が見つからなかった質問があります", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*組織*\n${escapeMrkdwn(payload.orgName)}` },
        { type: "mrkdwn", text: `*質問*\n${escapeMrkdwn(payload.question)}` },
      ],
    },
    { type: "divider" },
  ];
}

// ─── Email ───────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] email to ${to}: ${subject}`);
    return;
  }
  const from = process.env.RESEND_FROM ?? "noreply@mail.example.com";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[notify] Resend API failed: ${res.status} ${body.slice(0, 100)}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────

export async function notifyEscalation(
  organizationId: string,
  payload: EscalationPayload,
): Promise<void> {
  const [slackChannels, emailChannels] = await Promise.all([
    getEnabledChannels(organizationId, "slack"),
    getEnabledChannels(organizationId, "email"),
  ]);

  const fallback = `担当者への相談: ${payload.question} / ${payload.message}`;

  await Promise.allSettled([
    ...slackChannels.map((ch) =>
      postToSlack(ch.destination, escalationBlocks(payload), fallback),
    ),
    ...emailChannels.map((ch) =>
      sendEmail(
        ch.destination,
        `【${payload.orgName}】担当者への相談が届きました`,
        `<h2>担当者への相談が届きました</h2>
         <p><b>組織:</b> ${escapeHtml(payload.orgName)}</p>
         <p><b>送信者:</b> ${escapeHtml(payload.senderName)}</p>
         <p><b>元の質問:</b> ${escapeHtml(payload.question)}</p>
         <p><b>相談内容:</b><br>${escapeHtml(payload.message).replace(/\n/g, "<br>")}</p>`,
      ),
    ),
  ]);
}

export async function notifyUnanswered(
  organizationId: string,
  payload: UnansweredPayload,
): Promise<void> {
  const [slackChannels, emailChannels] = await Promise.all([
    getEnabledChannels(organizationId, "slack"),
    getEnabledChannels(organizationId, "email"),
  ]);

  const fallback = `回答が見つからなかった質問: ${payload.question}`;

  await Promise.allSettled([
    ...slackChannels.map((ch) =>
      postToSlack(ch.destination, unansweredBlocks(payload), fallback),
    ),
    ...emailChannels.map((ch) =>
      sendEmail(
        ch.destination,
        `【${payload.orgName}】回答が見つからなかった質問があります`,
        `<h2>回答が見つからなかった質問があります</h2>
         <p><b>組織:</b> ${escapeHtml(payload.orgName)}</p>
         <p><b>質問:</b> ${escapeHtml(payload.question)}</p>`,
      ),
    ),
  ]);
}
