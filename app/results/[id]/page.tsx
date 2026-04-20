import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { ResultsTable } from "@/components/results-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScan } from "@/lib/database";

export const dynamic = "force-dynamic";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const scan = await getScan(id);

  if (!scan) {
    notFound();
  }

  const totalUnusedCount = scan.report.unusedDependencies.length + scan.report.unusedDevDependencies.length;

  return (
    <main className="min-h-screen bg-[#0d1117]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/scan" className="inline-flex items-center text-sm text-slate-300 hover:text-slate-100">
          <ArrowLeft className="mr-2 size-4" />
          Back to scanner
        </Link>

        <header className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h1 className="text-3xl font-semibold text-slate-50">Scan report for {scan.projectName}</h1>
          <p className="mt-2 text-slate-300">
            {totalUnusedCount > 0
              ? `Found ${totalUnusedCount} removable packages based on AST import analysis.`
              : "No removable dependencies detected in the scanned source files."}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-400">
            <CalendarClock className="size-4" />
            <span>{new Date(scan.createdAt).toLocaleString()}</span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Files scanned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-100">{scan.report.filesScanned.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Used packages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-100">{scan.report.importedPackages.length.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Removable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-100">{totalUnusedCount.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Estimated savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-300">
                {scan.report.totalEstimatedKbSaved.toLocaleString()} KB
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">Removable dependency details</h2>
          <ResultsTable
            unusedDependencies={scan.report.unusedDependencies}
            unusedDevDependencies={scan.report.unusedDevDependencies}
            missingDependencies={scan.report.missingDependencies}
          />
        </section>

        {scan.report.parseErrors.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
            <h2 className="text-lg font-semibold text-amber-200">Parser warnings</h2>
            <p className="mt-1 text-sm text-amber-100">
              These files had parse fallbacks or syntax issues and may reduce analysis coverage.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-50">
              {scan.report.parseErrors.slice(0, 12).map((parseError) => (
                <li key={parseError}>{parseError}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
