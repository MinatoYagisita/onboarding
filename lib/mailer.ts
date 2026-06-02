const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendPasscodeEmail(
  email: string,
  code: string,
  orgName: string,
): Promise<void> {
  if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
    console.log(`[DEV] passcode for ${email}: ${code}`);
    return;
  }

  await sendEmail({
    to: email,
    subject: `【${orgName}】ログインパスコード: ${code}`,
    html: `
      <p>${orgName} のオンボーディング Q&amp;A にログインするためのパスコードです。</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
      <p>このパスコードは 10 分間有効です。</p>
      <p>このメールに心当たりがない場合は無視してください。</p>
    `,
  });
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const from = process.env.RESEND_FROM ?? "noreply@mail.example.com";
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}
