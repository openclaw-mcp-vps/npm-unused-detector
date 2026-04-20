import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntitlement, isEntitlementActive } from "@/lib/database";
import { createAccessCookie } from "@/lib/lemonsqueezy";

const verifyBodySchema = z.object({
  token: z.string().min(12),
});

function buildExpiry(entitlement: { expiresAt: string | null; type: "single" | "subscription" }) {
  if (entitlement.expiresAt) {
    return Math.floor(new Date(entitlement.expiresAt).getTime() / 1000);
  }

  const now = Math.floor(Date.now() / 1000);
  return entitlement.type === "single" ? now + 60 * 60 * 24 * 7 : now + 60 * 60 * 24 * 30;
}

export async function POST(request: Request) {
  try {
    const payload = verifyBodySchema.parse(await request.json());
    const entitlement = await getEntitlement(payload.token);

    if (!isEntitlementActive(entitlement)) {
      return NextResponse.json({ status: "pending" }, { status: 202 });
    }

    const exp = buildExpiry({
      expiresAt: entitlement.expiresAt,
      type: entitlement.type,
    });

    const response = NextResponse.json({
      status: "active",
      type: entitlement.type,
      scansRemaining: entitlement.scansRemaining,
    });

    response.cookies.set("nud_access", createAccessCookie({ token: payload.token, exp }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(exp - Math.floor(Date.now() / 1000), 60),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify purchase.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
