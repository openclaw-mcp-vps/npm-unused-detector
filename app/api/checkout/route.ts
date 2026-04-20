import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCheckoutUrl, createPurchaseToken, type CheckoutPlan } from "@/lib/lemonsqueezy";

const checkoutBodySchema = z.object({
  plan: z.enum(["single", "monthly"]),
});

function getOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return originHeader;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${protocol}://${hostHeader}`;
  }

  return "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const payload = checkoutBodySchema.parse(await request.json());
    const token = createPurchaseToken();

    const checkoutUrl = buildCheckoutUrl({
      plan: payload.plan as CheckoutPlan,
      token,
      origin: getOrigin(request),
    });

    return NextResponse.json({
      token,
      checkoutUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
