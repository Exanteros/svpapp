import { createHmac, timingSafeEqual } from "node:crypto";

interface RefereeCardPayload {
  purpose: "score-card";
  spielId: string;
  version: 1;
  exp: number;
}

const REFEREE_CARD_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function createRefereeCardToken(spielId: string) {
  const payload: RefereeCardPayload = {
    purpose: "score-card",
    spielId,
    version: 1,
    exp: Date.now() + REFEREE_CARD_TOKEN_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyRefereeCardToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<RefereeCardPayload>;

    if (payload.purpose !== "score-card" || payload.version !== 1 || !payload.spielId || !payload.exp) {
      return null;
    }

    if (!Number.isFinite(payload.exp) || Date.now() > payload.exp) {
      return null;
    }

    return {
      spielId: String(payload.spielId),
    };
  } catch {
    return null;
  }
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function getSecret() {
  return process.env.REFEREE_CARD_SECRET
    || process.env.SESSION_SECRET
    || process.env.ADMIN_PASSWORD_HASH
    || "dev-referee-card-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
