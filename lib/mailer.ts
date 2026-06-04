import nodemailer from "nodemailer";

function createTransport() {
  // SMTP設定（Gmail・Outlook・任意のSMTPサーバーに対応）
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasscodeEmail(
  email: string,
  code: string,
  orgName: string,
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`[DEV] passcode for ${email}: ${code}`);
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@example.com";

  await createTransport().sendMail({
    from: `"${orgName}" <${from}>`,
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
