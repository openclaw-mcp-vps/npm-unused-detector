"use client";

import { useMemo } from "react";
import { Copy, PackageMinus, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/types";

type ResultsDisplayProps = {
  result: AnalysisResult;
  sourceLabel: string;
};

function formatKb(value: number | null): string {
  if (value === null) return "n/a";
  if (value < 1024) return `${value.toFixed(1)} KB`;
  return `${(value / 1024).toFixed(2)} MB`;
}

export function ResultsDisplay({ result, sourceLabel }: ResultsDisplayProps) {
  const totalUnused =
    result.unusedDependencies.length + result.unusedDevDependencies.length;

  const parseErrorCount = result.fileParseErrors.length;

  const largeUnusedPackages = useMemo(
    () =>
      [...result.unusedDependencies, ...result.unusedDevDependencies]
        .filter((pkg) => (pkg.estimatedSizeKb ?? 0) > 250)
        .sort((a, b) => (b.estimatedSizeKb ?? 0) - (a.estimatedSizeKb ?? 0)),
    [result.unusedDependencies, result.unusedDevDependencies]
  );

  const copyCommand = async (cmd: string | null) => {
    if (!cmd) return;
    await navigator.clipboard.writeText(cmd);
  };

  return (
    <div className="space-y-6" data-animation="fade-up">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <PackageMinus className="h-5 w-5 text-accent" />
            Scan Results
          </CardTitle>
          <CardDescription>
            Source: {sourceLabel}. Scanned {result.scannedFiles} file
            {result.scannedFiles === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-[#101722] p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Unused packages</p>
            <p className="mt-2 text-3xl font-semibold">{totalUnused}</p>
          </div>
          <div className="rounded-lg border border-border bg-[#101722] p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Estimated savings</p>
            <p className="mt-2 text-3xl font-semibold">
              {formatKb(result.totalEstimatedSavingsKb)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-[#101722] p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Packages in use</p>
            <p className="mt-2 text-3xl font-semibold">{result.usedPackages.length}</p>
          </div>
        </CardContent>
      </Card>

      {result.unusedDependencies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Unused runtime dependencies</CardTitle>
            <CardDescription>
              Safe candidates to remove from `dependencies` if your runtime code never imports them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.unusedDependencies.map((dep) => (
              <div
                key={dep.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-[#101722] p-3"
              >
                <div>
                  <p className="font-medium">{dep.name}</p>
                  <p className="text-xs text-muted">{dep.versionRange}</p>
                </div>
                <Badge variant="secondary">{formatKb(dep.estimatedSizeKb)}</Badge>
              </div>
            ))}

            {result.uninstallCommand ? (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-[#0b1118] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all text-muted">{result.uninstallCommand}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCommand(result.uninstallCommand)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {result.unusedDevDependencies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Unused dev dependencies</CardTitle>
            <CardDescription>
              Build/test tooling that appears unreferenced in scanned source files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.unusedDevDependencies.map((dep) => (
              <div
                key={dep.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-[#101722] p-3"
              >
                <div>
                  <p className="font-medium">{dep.name}</p>
                  <p className="text-xs text-muted">{dep.versionRange}</p>
                </div>
                <Badge variant="secondary">{formatKb(dep.estimatedSizeKb)}</Badge>
              </div>
            ))}

            {result.uninstallDevCommand ? (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-[#0b1118] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all text-muted">{result.uninstallDevCommand}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCommand(result.uninstallDevCommand)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {largeUnusedPackages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Largest cleanup wins</CardTitle>
            <CardDescription>
              Start here for the biggest likely package-size reductions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {largeUnusedPackages.slice(0, 8).map((pkg) => (
              <Badge key={pkg.name} variant="outline" className="text-xs">
                {pkg.name} · {formatKb(pkg.estimatedSizeKb)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {parseErrorCount > 0 ? (
        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-5 w-5" />
              Partial scan warning
            </CardTitle>
            <CardDescription>
              {parseErrorCount} file{parseErrorCount === 1 ? "" : "s"} failed to parse. Review them before
              removing every package below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            {result.fileParseErrors.slice(0, 8).map((item) => (
              <div key={item.path} className="rounded-md border border-border bg-[#101722] p-3">
                <p className="font-mono text-xs text-text">{item.path}</p>
                <p className="mt-1 text-xs">{item.error}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
