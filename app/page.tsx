import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FolderSearch, Zap } from "lucide-react";

import { PricingCards } from "@/components/PricingCards";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const painPoints = [
  {
    title: "CLI noise",
    description:
      "Most dependency tools over-report and force manual triage across false positives.",
    icon: FolderSearch,
  },
  {
    title: "Slow cleanups",
    description:
      "Large repos mean long scripts and stale reports that never become actionable.",
    icon: Clock3,
  },
  {
    title: "Shipping risk",
    description:
      "Unused packages increase attack surface and bloat your install footprint.",
    icon: Zap,
  },
];

const faqItems = [
  {
    question: "How is this different from depcheck?",
    answer:
      "This scanner uses multi-parser AST extraction and returns a focused removal list with size estimates and uninstall commands, instead of broad CLI logs.",
  },
  {
    question: "What input formats are supported?",
    answer:
      "You can scan a public GitHub repo URL, upload package.json with a project zip, or upload package.json with a source folder.",
  },
  {
    question: "How does the paywall work?",
    answer:
      "After a successful Stripe checkout, your webhook stores the completed session and /api/access/claim sets a signed HTTP-only cookie to unlock scans.",
  },
  {
    question: "Can this handle TypeScript + JSX mixed codebases?",
    answer:
      "Yes. The parser stack covers JS, TS, JSX, and TSX with fallback parsers for tough files.",
  },
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12 sm:px-8 lg:px-12">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6" data-animation="fade-up">
          <Badge variant="secondary" className="w-fit">
            Devtools for indie teams
          </Badge>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
            NPM Unused Detector
            <span className="block text-accent">
              Scan package.json for deps you never import.
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Paste a GitHub URL or upload package.json + source files. We AST-scan every import,
            compare with your dependencies, and return a clean removal list with estimated size savings.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/scan" className={cn(buttonVariants({ size: "lg" }))}>
              Open Scanner
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a
              href={paymentLink}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Buy Access
            </a>
          </div>
        </div>

        <Card className="overflow-hidden border-accent/30">
          <CardHeader>
            <CardTitle>What you get in one scan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-[#101722] p-4">
              <p className="text-xs text-muted">UNUSED PACKAGE FINDINGS</p>
              <p className="mt-1 text-2xl font-semibold text-accent">7 candidates</p>
            </div>
            <div className="rounded-lg border border-border bg-[#101722] p-4">
              <p className="text-xs text-muted">ESTIMATED UNPACKED SIZE SAVED</p>
              <p className="mt-1 text-2xl font-semibold">2.3 MB</p>
            </div>
            <div className="rounded-lg border border-border bg-[#101722] p-4">
              <p className="text-xs text-muted">READY TO RUN</p>
              <code className="mt-1 block text-sm text-muted">
                npm uninstall left-pad chalk lodash-es
              </code>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold">The problem with npm bloat</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {painPoints.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <item.icon className="h-5 w-5 text-accent" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold">Why this tool works</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-sm text-muted">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-accent" />
                  AST parsing across JS, JSX, TS, and TSX for accurate import detection.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-accent" />
                  Runtime and dev dependency breakdown with one-click uninstall commands.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-accent" />
                  Fast hosted workflow instead of CLI setup friction.
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted">
                Built for solo developers who move quickly and want clean dependency graphs before
                every deploy. It fits side projects, client repos, and startup codebases where every
                build minute matters.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="space-y-6">
        <h2 className="text-3xl font-semibold">Pricing</h2>
        <PricingCards />
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-gradient-to-r from-surface to-[#142030] p-8 text-center">
        <h2 className="text-2xl font-semibold">Stop shipping dependency dead weight</h2>
        <p className="mt-3 text-muted">
          Run your first scan in minutes and keep your package graph lean on every release.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/scan" className={cn(buttonVariants({ size: "lg" }))}>
            Scan a Project
          </Link>
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            Buy Access
          </a>
        </div>
      </section>
    </main>
  );
}
