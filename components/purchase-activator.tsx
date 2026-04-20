"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MAX_POLLS = 8;
const POLL_INTERVAL_MS = 1600;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function PurchaseActivator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const checkoutStatus = searchParams.get("checkout");
  const token = searchParams.get("token");

  const shouldActivate = useMemo(() => checkoutStatus === "success" && Boolean(token), [checkoutStatus, token]);

  useEffect(() => {
    if (!shouldActivate || !token) {
      return;
    }

    let cancelled = false;

    const verifyPurchase = async () => {
      setMessage("Confirming payment with Lemon Squeezy...");

      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        const response = await fetch("/api/access/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          setMessage("Access unlocked. Loading scanner...");
          router.replace("/scan");
          router.refresh();
          return;
        }

        if (response.status !== 202) {
          const payload = (await response.json()) as { error?: string };
          setMessage(payload.error ?? "Could not verify payment yet. Please refresh in a few seconds.");
          return;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      setMessage("Payment is still syncing. Refresh this page in a few seconds to activate access.");
    };

    void verifyPurchase();

    return () => {
      cancelled = true;
    };
  }, [router, shouldActivate, token]);

  if (!shouldActivate && !message) {
    return null;
  }

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-200">
        <LoaderCircle className="size-4 animate-spin" />
        <span>{message ?? "Processing your checkout..."}</span>
      </CardContent>
    </Card>
  );
}
