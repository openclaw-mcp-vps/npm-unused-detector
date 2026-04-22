import type { Metadata } from "next";
import Link from "next/link";

import { FileUpload } from "@/components/FileUpload";
import { PricingCards } from "@/components/PricingCards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPageAccess } from "@/lib/access";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Scan",
  description:
    "Analyze npm dependencies against real import usage and get a removal plan.",
};

type ScanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const claimMessages: Record<string, { tone: "ok" | "warn"; text: string }> = {
  success: {
    tone: "ok",
    text: "Payment confirmed. This browser is unlocked and ready to scan.",
  },
  not_found: {
    tone: "warn",
    text: "We couldn't verify that checkout session yet. Wait a few seconds and retry the claim URL.",
  },
  missing_session: {
    tone: "warn",
    text: "Missing session_id in claim URL. Update your Stripe completion URL template.",
  },
};

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const params = searchParams ? await searchParams : {};
  const claim = typeof params.claim === "string" ? params.claim : null;
  const claimMessage = claim ? claimMessages[claim] : null;

  const hasAccess = await hasPageAccess();
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <Badge variant={hasAccess ? "default" : "secondary"} className="w-fit">
          {hasAccess ? "Access unlocked" : "Access required"}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">NPM Unused Detector Scanner</h1>
        <p className="max-w-3xl text-muted">
          Find unreferenced npm packages with AST-level import matching and remove the bloat before it
          ships.
        </p>
      </header>

      {claimMessage ? (
        <Card className={claimMessage.tone === "ok" ? "border-accent/40" : "border-danger/40"}>
          <CardContent className="pt-6">
            <p className={claimMessage.tone === "ok" ? "text-accent" : "text-danger"}>
              {claimMessage.text}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!hasAccess ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Unlock scanner access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted">
              <p>
                This feature is behind a paywall. Purchase once or subscribe, then return through your
                completion URL to set the access cookie.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Buy with Stripe
                </a>
                <Link
                  href="/"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Back to Landing Page
                </Link>
              </div>
              <p>
                Configure Stripe Payment Link completion URL:
                {" "}
                <code>/api/access/claim?session_id={'{CHECKOUT_SESSION_ID}'}</code>
              </p>
            </CardContent>
          </Card>
          <PricingCards compact />
        </div>
      ) : (
        <FileUpload hasAccess={hasAccess} paymentLink={paymentLink} />
      )}

      <footer className="pt-4 text-sm text-muted">
        Need help? Check the webhook health on
        {" "}
        <code>/api/health</code>
        {" "}
        and verify checkout events are posted to
        {" "}
        <code>/api/webhooks/lemonsqueezy</code>.
      </footer>
    </main>
  );
}
