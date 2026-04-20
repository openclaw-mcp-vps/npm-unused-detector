"use client";

import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url?: {
        Open: (checkoutUrl: string) => void;
      };
    };
  }
}

interface PricingCardProps {
  plan: "single" | "monthly";
  title: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlight?: boolean;
  ctaLabel: string;
}

let lemonScriptPromise: Promise<void> | null = null;

function ensureLemonScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.LemonSqueezy?.Url?.Open) {
    return Promise.resolve();
  }

  if (!lemonScriptPromise) {
    lemonScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://assets.lemonsqueezy.com/lemon.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Could not load Lemon Squeezy script.")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://assets.lemonsqueezy.com/lemon.js";
      script.defer = true;
      script.onload = () => {
        resolve();
      };
      script.onerror = () => reject(new Error("Could not load Lemon Squeezy script."));
      document.head.appendChild(script);
    });
  }

  return lemonScriptPromise;
}

export function PricingCard(props: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const featureNodes = useMemo(
    () => props.features.map((feature) => <li key={feature} className="text-sm text-slate-300">{feature}</li>),
    [props.features],
  );

  const beginCheckout = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: props.plan }),
      });

      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? "Could not start checkout.");
      }

      await ensureLemonScript();
      window.createLemonSqueezy?.();

      if (window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(payload.checkoutUrl);
      } else {
        window.location.assign(payload.checkoutUrl);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected checkout error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative h-full border-slate-800 bg-slate-950/70",
        props.highlight && "border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.12)]",
      )}
    >
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-slate-50">{props.price}</span>
          <span className="text-sm text-slate-400">{props.cadence}</span>
        </div>
        <ul className="space-y-2">{featureNodes}</ul>
        {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={beginCheckout} disabled={isLoading}>
          {isLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
          {props.ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
