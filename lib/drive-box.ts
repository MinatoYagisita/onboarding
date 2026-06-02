import { encrypt, decrypt } from "./encrypt";

const TOKEN_URL = "https://api.box.com/oauth2/token";
const API = "https://api.box.com/2.0";

function redirectUri() {
  return `${process.env.APP_BASE_URL}/api/org/integrations/box/callback`;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.BOX_CLIENT_ID!,
    redirect_uri: redirectUri(),
    state,
  });
  return `https://account.box.com/api/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.BOX_CLIENT_ID!,
      client_secret: process.env.BOX_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
    }),
  });
  const data = await resp.json();
  if (!data.refresh_token) throw new Error("リフレッシュトークンが取得できませんでした");
  return encrypt(data.refresh_token);
}

export async function getAccessToken(encryptedToken: string): Promise<{ accessToken: string; newEncryptedToken: string }> {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decrypt(encryptedToken),
      client_id: process.env.BOX_CLIENT_ID!,
      client_secret: process.env.BOX_CLIENT_SECRET!,
    }),
  });
  const data = await resp.json();
  return {
    accessToken: data.access_token,
    newEncryptedToken: encrypt(data.refresh_token),
  };
}

export async function listFiles(encryptedToken: string, folderId: string) {
  const { accessToken } = await getAccessToken(encryptedToken);
  const resp = await fetch(
    `${API}/folders/${folderId}/items?limit=1000&fields=id,name,type,modified_at,size,content_type`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await resp.json();
  return (data.entries ?? []).filter((f: { type: string }) => f.type === "file");
}

export async function downloadFile(encryptedToken: string, fileId: string): Promise<Buffer> {
  const { accessToken } = await getAccessToken(encryptedToken);
  const resp = await fetch(`${API}/files/${fileId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return Buffer.from(await resp.arrayBuffer());
}

export async function getFolderName(encryptedToken: string, folderId: string): Promise<string> {
  const { accessToken } = await getAccessToken(encryptedToken);
  const resp = await fetch(`${API}/folders/${folderId}?fields=name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return data.name ?? folderId;
}
