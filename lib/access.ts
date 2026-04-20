import { getEntitlement, isEntitlementActive } from "@/lib/database";
import { readAccessCookie } from "@/lib/lemonsqueezy";

export interface AccessContext {
  token: string;
  entitlementType: "single" | "subscription";
  scansRemaining: number | null;
}

export async function getAccessContextFromCookie(cookieValue: string | null | undefined) {
  const parsedCookie = readAccessCookie(cookieValue);
  if (!parsedCookie) {
    return null;
  }

  const entitlement = await getEntitlement(parsedCookie.token);
  if (!isEntitlementActive(entitlement)) {
    return null;
  }

  return {
    token: parsedCookie.token,
    entitlementType: entitlement.type,
    scansRemaining: entitlement.scansRemaining,
  } satisfies AccessContext;
}
