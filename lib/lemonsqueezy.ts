import { createHmac, timingSafeEqual } from "node:crypto";

const ACCESS_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

export const ACCESS_COOKIE_NAME = "nud_paid_access";

type AccessPayload = {
  exp: number;
  email: string | null;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getCookieSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || "development-insecure-secret";
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAccessCookie(email: string | null): {
  value: string;
  maxAge: number;
} {
  const payload: AccessPayload = {
    exp: Math.floor(Date.now() / 1000) + ACCESS_COOKIE_TTL_SECONDS,
    email,
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded, getCookieSecret());

  return {
    value: `${encoded}.${signature}`,
    maxAge: ACCESS_COOKIE_TTL_SECONDS,
  };
}

export function verifyAccessCookie(value: string | undefined): boolean {
  if (!value) return false;

  const [encoded, providedSig] = value.split(".");
  if (!encoded || !providedSig) return false;

  const expectedSig = sign(encoded, getCookieSecret());

  const providedBuffer = Buffer.from(providedSig);
  const expectedBuffer = Buffer.from(expectedSig);

  if (
    providedBuffer.byteLength !== expectedBuffer.byteLength ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as AccessPayload;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function verifyStripeSignature(params: {
  body: string;
  stripeSignatureHeader: string | null;
}): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }

  const signatureHeader = params.stripeSignatureHeader;
  if (!signatureHeader) return false;

  const values = Object.fromEntries(
    signatureHeader.split(",").map((entry) => {
      const [key, value] = entry.split("=");
      return [key, value];
    })
  );

  const timestamp = values.t;
  const signature = values.v1;

  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) {
    return false;
  }

  const signedPayload = `${timestamp}.${params.body}`;
  const computed = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(computed);
  if (sigA.byteLength !== sigB.byteLength) return false;

  return timingSafeEqual(sigA, sigB);
}
