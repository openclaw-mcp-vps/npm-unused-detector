import { NextResponse } from "next/server";

import { recordCompletedStripeCheckout } from "@/lib/database";
import { verifyStripeSignature } from "@/lib/lemonsqueezy";

type StripeCheckoutCompletedEvent = {
  type: "checkout.session.completed";
  data?: {
    object?: {
      id?: string;
      customer_email?: string | null;
      customer_details?: {
        email?: string | null;
      };
      created?: number;
    };
  };
};

export async function POST(request: Request) {
  const body = await request.text();

  const isValidSignature = verifyStripeSignature({
    body,
    stripeSignatureHeader: request.headers.get("stripe-signature"),
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as StripeCheckoutCompletedEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const sessionId = session?.id;

    if (sessionId) {
      await recordCompletedStripeCheckout({
        sessionId,
        email: session.customer_details?.email ?? session.customer_email ?? null,
        paidAt: session.created
          ? new Date(session.created * 1000).toISOString()
          : undefined,
      });
    }
  }

  return NextResponse.json({ received: true });
}
