import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessContextFromCookie } from "@/lib/access";
import { analyzeProjectFiles } from "@/lib/ast-analyzer";
import { consumeEntitlementScan, saveScan } from "@/lib/database";
import { buildDependencyReport, parsePackageJsonText } from "@/lib/dependency-checker";
import { fetchGitHubProjectSnapshot } from "@/lib/github-client";

const githubScanSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const access = await getAccessContextFromCookie(request.cookies.get("nud_access")?.value ?? null);
  if (!access) {
    return NextResponse.json(
      { error: "Payment required before running scans." },
      {
        status: 402,
      },
    );
  }

  try {
    const payload = githubScanSchema.parse(await request.json());
    const snapshot = await fetchGitHubProjectSnapshot(payload.url);
    const packageJson = parsePackageJsonText(snapshot.packageJsonText);
    const analysis = analyzeProjectFiles(snapshot.sourceFiles);

    const report = await buildDependencyReport({
      packageJson,
      importedPackages: analysis.importedPackages,
      filesScanned: analysis.filesScanned,
      parseErrors: analysis.parseErrors,
    });

    const savedScan = await saveScan({
      source: "github",
      projectName: snapshot.projectName,
      filesScanned: analysis.filesScanned,
      report,
    });

    const remaining = await consumeEntitlementScan(access.token);

    return NextResponse.json({
      id: savedScan.id,
      report,
      scansRemaining: remaining?.scansRemaining ?? null,
      repository: `${snapshot.owner}/${snapshot.repo}`,
      branch: snapshot.branch,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub scan failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
