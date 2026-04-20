import { NextResponse } from "next/server";
import { entitlementFromWebhookPayload, verifyLemonWebhookSignature } from "@/lib/lemonsqueezy";
import { upsertEntitlement } from "@/lib/database";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const entitlement = entitlementFromWebhookPayload(payload);

  if (entitlement) {
    await upsertEntitlement({
      token: entitlement.token,
      type: entitlement.type,
      scansRemaining: entitlement.scansRemaining,
      expiresAt: entitlement.expiresAt,
      orderId: entitlement.orderId,
      customerEmail: entitlement.customerEmail,
    });
  }

  return NextResponse.json({ received: true });
}
