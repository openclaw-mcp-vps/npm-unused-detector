import Link from "next/link";
import { ArrowRight, GitBranch, ScanLine, UploadCloud, Zap } from "lucide-react";
import { PricingCard } from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "How is this different from depcheck?",
    answer:
      "depcheck often flags noise in modern TS/Next projects. NPM Unused Detector parses your actual AST imports and keeps build-tool exceptions explicit so the output is cleaner and faster to act on.",
  },
  {
    question: "What can I upload?",
    answer:
      "Use either a public GitHub repo URL or upload package.json plus your source folder as direct files or a zip. JavaScript and TypeScript files are supported.",
  },
  {
    question: "Do you store my code?",
    answer:
      "Scans are stored as summarized results and import metadata so you can revisit reports. Raw repository uploads are processed server-side for analysis only.",
  },
  {
    question: "What if my project has special runtime loading?",
    answer:
      "You still get a strong default signal. For dynamic plugin systems, treat the removable list as a review queue before deleting dependencies.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.08),transparent_40%),#0d1117]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 md:p-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>NPM Unused Detector</Badge>
            <Badge variant="muted">Built for solo dev velocity</Badge>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            Scan your `package.json` against real imports and remove dead npm weight in minutes.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Paste a GitHub URL or upload package.json + source files. We run AST import analysis, cross-reference
            dependencies and devDependencies, and produce a safe cleanup list with estimated KB savings.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/scan"
              className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              Start a scan
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <a href="#pricing" className="inline-flex items-center rounded-md border border-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-900">
              View pricing
            </a>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <UploadCloud className="size-5 text-emerald-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-100">Upload or GitHub</h2>
            <p className="mt-2 text-sm text-slate-300">
              Supports direct upload or public repository URLs, so cleanup starts where your project already lives.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <ScanLine className="size-5 text-sky-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-100">AST-based import scan</h2>
            <p className="mt-2 text-sm text-slate-300">
              Parses JS/TS source trees directly, reducing false positives from config-heavy toolchains.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <Zap className="size-5 text-amber-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-100">Actionable cleanup list</h2>
            <p className="mt-2 text-sm text-slate-300">
              Get a prioritized removable list with estimated package size savings so you can cut bloat confidently.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
          <h2 className="text-2xl font-semibold text-slate-50">Why indie developers pay for this</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-slate-100">The problem</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                <li>Projects accumulate stale deps after spikes, pivots, and template experiments.</li>
                <li>CLI output is often noisy, so teams postpone cleanup until package size hurts CI and install time.</li>
                <li>Dependency debt makes upgrades riskier because no one trusts what can be removed.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-100">The solution</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                <li>Fast hosted scan across your app code using parser-backed import detection.</li>
                <li>Visual dependency diff grouped by `dependencies` and `devDependencies`.
                </li>
                <li>Pay-per-scan for one-offs or monthly unlimited for continuous hygiene.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="pricing" className="mt-10">
          <div className="mb-5 flex items-center gap-2">
            <GitBranch className="size-5 text-emerald-300" />
            <h2 className="text-2xl font-semibold text-slate-50">Pricing</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <PricingCard
              plan="single"
              title="Single Scan"
              description="Ideal for one cleanup sprint"
              price="$3"
              cadence="per scan"
              features={[
                "1 full dependency scan",
                "AST import cross-reference",
                "Removable package list",
                "Estimated KB savings",
              ]}
              ctaLabel="Buy single scan"
            />
            <PricingCard
              plan="monthly"
              title="Unlimited"
              description="For active repos and recurring cleanup"
              price="$12"
              cadence="per month"
              features={[
                "Unlimited scans",
                "GitHub + upload workflows",
                "Always-on cleanup baseline",
                "Best value for weekly refactors",
              ]}
              highlight
              ctaLabel="Start unlimited"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">Secure checkout is handled through Lemon Squeezy overlay.</p>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
          <h2 className="text-2xl font-semibold text-slate-50">FAQ</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <h3 className="font-medium text-slate-100">{faq.question}</h3>
                <p className="mt-1 text-sm text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
