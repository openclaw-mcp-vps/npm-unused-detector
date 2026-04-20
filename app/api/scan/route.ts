import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessContextFromCookie } from "@/lib/access";
import { analyzeProjectFiles, isScannableSourceFile } from "@/lib/ast-analyzer";
import { consumeEntitlementScan, saveScan } from "@/lib/database";
import { buildDependencyReport, parsePackageJsonText } from "@/lib/dependency-checker";

const jsonScanSchema = z.object({
  packageJsonText: z.string().min(2),
  files: z.record(z.string()),
  projectName: z.string().optional(),
});

async function extractFilesFromZip(zipFile: File) {
  const buffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const sourceFiles: Record<string, string> = {};

  const zipEntries = Object.entries(zip.files);
  for (const [entryPath, entry] of zipEntries) {
    if (entry.dir || !isScannableSourceFile(entryPath)) {
      continue;
    }

    sourceFiles[entryPath] = await entry.async("text");
  }

  return sourceFiles;
}

async function parseScanInput(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const packageJsonInput = formData.get("packageJson");
    const sourceZipInput = formData.get("sourceZip");

    if (!(packageJsonInput instanceof File)) {
      throw new Error("Upload package.json before scanning.");
    }

    const packageJsonText = await packageJsonInput.text();
    let sourceFiles: Record<string, string> = {};

    if (sourceZipInput instanceof File && sourceZipInput.size > 0) {
      sourceFiles = await extractFilesFromZip(sourceZipInput);
    }

    if (Object.keys(sourceFiles).length === 0) {
      throw new Error("Upload a source zip with .js/.ts files, or choose a source folder.");
    }

    return {
      packageJsonText,
      sourceFiles,
      projectName: packageJsonInput.name.replace(/\.json$/i, "") || "Uploaded project",
    };
  }

  const jsonPayload = jsonScanSchema.parse(await request.json());

  return {
    packageJsonText: jsonPayload.packageJsonText,
    sourceFiles: jsonPayload.files,
    projectName: jsonPayload.projectName ?? "Uploaded project",
  };
}

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
    const input = await parseScanInput(request);
    const packageJson = parsePackageJsonText(input.packageJsonText);
    const analysis = analyzeProjectFiles(input.sourceFiles);

    if (analysis.filesScanned === 0) {
      return NextResponse.json(
        {
          error: "No scannable JavaScript or TypeScript files were found.",
        },
        { status: 400 },
      );
    }

    const report = await buildDependencyReport({
      packageJson,
      importedPackages: analysis.importedPackages,
      filesScanned: analysis.filesScanned,
      parseErrors: analysis.parseErrors,
    });

    const savedScan = await saveScan({
      source: "upload",
      projectName: packageJson.name ?? input.projectName,
      filesScanned: analysis.filesScanned,
      report,
    });

    const remaining = await consumeEntitlementScan(access.token);

    return NextResponse.json({
      id: savedScan.id,
      report: savedScan.report,
      scansRemaining: remaining?.scansRemaining ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
