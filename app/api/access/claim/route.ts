import { NextResponse } from "next/server";

import { getStripeSession } from "@/lib/database";
import { createAccessCookie, ACCESS_COOKIE_NAME } from "@/lib/lemonsqueezy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/scan?claim=missing_session", request.url));
  }

  const checkout = await getStripeSession(sessionId);
  if (!checkout) {
    return NextResponse.redirect(new URL("/scan?claim=not_found", request.url));
  }

  const accessCookie = createAccessCookie(checkout.email);

  const response = NextResponse.redirect(
    new URL("/scan?claim=success", request.url)
  );

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: accessCookie.value,
    maxAge: accessCookie.maxAge,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
