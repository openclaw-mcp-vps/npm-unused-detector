import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { FileSearch } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { GithubInput } from "@/components/github-input";
import { PricingCard } from "@/components/pricing-card";
import { PurchaseActivator } from "@/components/purchase-activator";
import { Badge } from "@/components/ui/badge";
import { getAccessContextFromCookie } from "@/lib/access";

export const metadata: Metadata = {
  title: "Run Scan | NPM Unused Detector",
  description: "Run dependency scans by upload or GitHub URL and get an actionable removal report.",
};

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const cookieStore = await cookies();
  const access = await getAccessContextFromCookie(cookieStore.get("nud_access")?.value ?? null);

  return (
    <main className="min-h-screen bg-[#0d1117]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            <FileSearch className="size-4 text-emerald-300" />
            <span>Dependency cleanup scanner</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-50">Run a package import scan</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Upload `package.json` plus source files, or scan directly from GitHub. We parse every import and surface
            removable dependencies with estimated package weight savings.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={access ? "default" : "muted"}>{access ? "Access unlocked" : "Purchase required"}</Badge>
            {access?.entitlementType === "single" ? (
              <Badge variant="muted">{access.scansRemaining ?? 0} scans remaining</Badge>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Need context first? <Link className="text-emerald-300 hover:text-emerald-200" href="/">Return to overview and FAQ</Link>.
          </p>
        </header>

        <PurchaseActivator />

        {access ? (
          <div className="grid gap-6 md:grid-cols-2">
            <GithubInput enabled />
            <FileUpload enabled />
          </div>
        ) : (
          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h2 className="text-xl font-semibold text-slate-100">Unlock the scanner</h2>
            <p className="text-sm text-slate-300">
              The analysis tool is paywalled to keep scans fast and hosted reliably. Choose a plan, complete checkout,
              then this page will automatically unlock.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <PricingCard
                plan="single"
                title="Single Scan"
                description="One project cleanup run"
                price="$3"
                cadence="per scan"
                features={["AST import scan", "Dependencies + devDependencies report", "Estimated KB savings"]}
                ctaLabel="Unlock 1 scan"
              />
              <PricingCard
                plan="monthly"
                title="Unlimited"
                description="Continuous dependency hygiene"
                price="$12"
                cadence="per month"
                features={["Unlimited scans", "GitHub + upload support", "Best fit for active repos"]}
                ctaLabel="Unlock unlimited"
                highlight
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
