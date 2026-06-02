import { google } from "googleapis";
import { encrypt, decrypt } from "./encrypt";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

function redirectUri() {
  return `${process.env.APP_BASE_URL}/api/org/integrations/google-drive/callback`;
}

function makeClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri()
  );
}

export async function getAccessToken(encryptedToken: string): Promise<string> {
  const client = makeClient();
  client.setCredentials({ refresh_token: decrypt(encryptedToken) });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("アクセストークンの取得に失敗しました");
  return token;
}

export function getAuthUrl(state: string): string {
  return makeClient().generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string): Promise<string> {
  const { tokens } = await makeClient().getToken(code);
  if (!tokens.refresh_token) throw new Error("リフレッシュトークンが取得できませんでした");
  return encrypt(tokens.refresh_token);
}

function authedDrive(encryptedToken: string) {
  const client = makeClient();
  client.setCredentials({ refresh_token: decrypt(encryptedToken) });
  return google.drive({ version: "v3", auth: client });
}

export async function listFiles(encryptedToken: string, folderId: string) {
  const drive = authedDrive(encryptedToken);
  const resp = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,modifiedTime,size)",
    pageSize: 1000,
  });
  return resp.data.files ?? [];
}

export async function downloadFile(
  encryptedToken: string,
  fileId: string,
  mimeType: string
): Promise<Buffer> {
  const drive = authedDrive(encryptedToken);
  if (mimeType === "application/vnd.google-apps.document") {
    const resp = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(resp.data as ArrayBuffer);
  }
  const resp = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(resp.data as ArrayBuffer);
}

export async function getFolderName(encryptedToken: string, folderId: string): Promise<string> {
  const drive = authedDrive(encryptedToken);
  const resp = await drive.files.get({ fileId: folderId, fields: "name" });
  return resp.data.name ?? folderId;
}
