import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessCookie } from "@/lib/lemonsqueezy";

export function hasAccessCookieValue(value: string | undefined): boolean {
  return verifyAccessCookie(value);
}

export function hasApiAccess(request: NextRequest): boolean {
  const value = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  return hasAccessCookieValue(value);
}

export async function hasPageAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  return hasAccessCookieValue(value);
}
