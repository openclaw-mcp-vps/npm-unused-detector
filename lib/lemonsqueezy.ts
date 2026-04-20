import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type CheckoutPlan = "single" | "monthly";

export interface AccessCookiePayload {
  token: string;
  exp: number;
}

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    attributes?: {
      customer_email?: string;
      custom_data?: Record<string, unknown>;
      first_order_item?: {
        product_name?: string;
        variant_name?: string;
      };
      renews_at?: string;
      ends_at?: string;
    };
  };
}

function getSigningSecret() {
  return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "local-dev-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

export function createPurchaseToken() {
  return randomBytes(16).toString("hex");
}

export function createAccessCookie(payload: AccessCookiePayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function readAccessCookie(cookieValue: string | undefined | null) {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessCookiePayload;

    if (!payload.token || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyLemonWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", getSigningSecret()).update(rawBody).digest("hex");

  if (digest.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export function buildCheckoutUrl(options: {
  plan: CheckoutPlan;
  token: string;
  origin: string;
}) {
  const configuredProduct = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  if (!configuredProduct) {
    throw new Error("NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID is not configured");
  }

  const baseUrl = configuredProduct.startsWith("http")
    ? new URL(configuredProduct)
    : new URL(`https://checkout.lemonsqueezy.com/buy/${configuredProduct}`);

  baseUrl.searchParams.set("checkout[custom][scan_token]", options.token);
  baseUrl.searchParams.set("checkout[custom][plan]", options.plan);
  baseUrl.searchParams.set("checkout[embed]", "1");
  baseUrl.searchParams.set(
    "checkout[success_url]",
    `${options.origin}/scan?checkout=success&token=${options.token}`,
  );

  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  if (storeId) {
    baseUrl.searchParams.set("store", storeId);
  }

  return baseUrl.toString();
}

export function entitlementFromWebhookPayload(rawPayload: unknown) {
  const payload = rawPayload as LemonWebhookPayload;
  const eventName = payload.meta?.event_name ?? "";

  const customData = {
    ...(payload.data?.attributes?.custom_data ?? {}),
    ...(payload.meta?.custom_data ?? {}),
  };

  const tokenCandidate = customData.scan_token ?? customData.scanToken;
  if (typeof tokenCandidate !== "string" || !tokenCandidate) {
    return null;
  }

  const explicitPlan = customData.plan;
  const productName = `${payload.data?.attributes?.first_order_item?.product_name ?? ""} ${
    payload.data?.attributes?.first_order_item?.variant_name ?? ""
  }`.toLowerCase();

  const isSubscription =
    explicitPlan === "monthly" ||
    eventName.includes("subscription") ||
    /(subscription|monthly|unlimited)/.test(productName);

  const renewsAt = payload.data?.attributes?.renews_at;
  const endsAt = payload.data?.attributes?.ends_at;

  return {
    token: tokenCandidate,
    type: isSubscription ? ("subscription" as const) : ("single" as const),
    scansRemaining: isSubscription ? null : 1,
    expiresAt: isSubscription ? renewsAt ?? endsAt ?? null : null,
    orderId: payload.data?.id,
    customerEmail: payload.data?.attributes?.customer_email,
    eventName,
  };
}
