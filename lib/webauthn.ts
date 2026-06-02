import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransport,
} from "@simplewebauthn/server";
import { db } from "@/lib/db";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function rpId(): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return new URL(base).hostname;
}

function rpOrigin(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

function rpName(): string {
  return "オンボーディング Q&A";
}

function decodeClientDataJSON(b64url: string): { challenge: string } {
  const json = Buffer.from(b64url, "base64url").toString("utf-8");
  return JSON.parse(json) as { challenge: string };
}

// ─── Registration ───────────────────────────────────────────────

export async function startRegistration(userId: string, userEmail: string, userName: string) {
  const existingCreds = await db.webAuthnCredential.findMany({
    where: { userId },
    select: { id: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: rpName(),
    rpID: rpId(),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: "none",
    excludeCredentials: existingCreds.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await db.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      type: "registration",
      userId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return options;
}

export async function finishRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  credentialName?: string,
) {
  const challengeRecord = await db.webAuthnChallenge.findFirst({
    where: { type: "registration", userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challengeRecord) throw new Error("チャレンジが見つかりません。再度お試しください。");

  await db.webAuthnChallenge.delete({ where: { id: challengeRecord.id } });

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: rpOrigin(),
    expectedRPID: rpId(),
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("認証器の検証に失敗しました。");
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await db.webAuthnCredential.create({
    data: {
      id: credential.id,
      userId,
      webauthnUserId: userId,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: (response.response.transports ?? []) as string[],
      name: credentialName ?? null,
    },
  });

  return { verified: true };
}

// ─── Authentication ──────────────────────────────────────────────

export async function startAuthentication(email: string, organizationId: string) {
  const user = await db.user.findFirst({
    where: { email, deletedAt: null },
    include: { webauthnCredentials: { select: { id: true, transports: true } } },
  });

  const allowCredentials =
    user?.webauthnCredentials?.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransport[],
    })) ?? [];

  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  await db.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      type: "authentication",
      email,
      organizationId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return options;
}

export async function finishAuthentication(response: AuthenticationResponseJSON) {
  // Extract the challenge from clientDataJSON
  const clientData = decodeClientDataJSON(response.response.clientDataJSON);
  const challengeValue = clientData.challenge;

  const record = await db.webAuthnChallenge.findUnique({
    where: { challenge: challengeValue },
  });
  if (!record || record.expiresAt < new Date()) {
    throw new Error("チャレンジが見つかりません。再度お試しください。");
  }

  await db.webAuthnChallenge.delete({ where: { id: record.id } });

  const credential = await db.webAuthnCredential.findUnique({
    where: { id: response.id },
    include: { user: true },
  });
  if (!credential) throw new Error("認証器が登録されていません。");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: record.challenge,
    expectedOrigin: rpOrigin(),
    expectedRPID: rpId(),
    requireUserVerification: false,
    credential: {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: Number(credential.counter),
      transports: credential.transports as AuthenticatorTransport[],
    },
  });

  if (!verification.verified) throw new Error("認証に失敗しました。");

  await db.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return { user: credential.user, organizationId: record.organizationId };
}
