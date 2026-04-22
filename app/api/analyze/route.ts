import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasApiAccess } from "@/lib/access";
import {
  analyzeDependencies,
  isSupportedSourceFile,
} from "@/lib/dependency-analyzer";

type UploadExtraction = {
  packageJsonContent: string | null;
  sourceFiles: Array<{ path: string; content: string }>;
};

const jsonSchema = z.object({
  packageJson: z.string(),
  sourceFiles: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string(),
    })
  ),
});

const ZIP_EXCLUDED = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
]);

function normalizeRelativePath(input: string): string {
  return input.replace(/^\/+/, "").replace(/\\/g, "/");
}

function shouldSkip(relativePath: string): boolean {
  return relativePath.split("/").some((part) => ZIP_EXCLUDED.has(part));
}

function detectCommonZipPrefix(paths: string[]): string | null {
  const first = paths.find((path) => path.includes("/"));
  if (!first) return null;

  const prefix = first.split("/")[0];
  if (!prefix) return null;

  const everyPathHasPrefix = paths.every((path) =>
    path === prefix ? true : path.startsWith(`${prefix}/`)
  );

  return everyPathHasPrefix ? `${prefix}/` : null;
}

async function extractZipContents(file: File): Promise<UploadExtraction> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  const commonPrefix = detectCommonZipPrefix(paths);

  let packageJsonContent: string | null = null;
  const sourceFiles: Array<{ path: string; content: string }> = [];

  for (const fullPath of paths) {
    const relativePath = normalizeRelativePath(
      commonPrefix ? fullPath.replace(commonPrefix, "") : fullPath
    );

    if (!relativePath || shouldSkip(relativePath)) continue;

    const entry = zip.files[fullPath];
    if (!entry) continue;

    if (relativePath === "package.json" && !packageJsonContent) {
      packageJsonContent = await entry.async("string");
      continue;
    }

    if (!isSupportedSourceFile(relativePath)) continue;

    sourceFiles.push({
      path: relativePath,
      content: await entry.async("string"),
    });
  }

  return {
    packageJsonContent,
    sourceFiles,
  };
}

async function extractMultipart(formData: FormData): Promise<UploadExtraction> {
  let packageJsonContent: string | null = null;
  let sourceFiles: Array<{ path: string; content: string }> = [];

  const packageJsonFile = formData.get("packageJson");
  if (packageJsonFile instanceof File && packageJsonFile.size > 0) {
    packageJsonContent = await packageJsonFile.text();
  }

  const sourceArchive = formData.get("sourceArchive");
  if (sourceArchive instanceof File && sourceArchive.size > 0) {
    const zipResult = await extractZipContents(sourceArchive);
    sourceFiles = zipResult.sourceFiles;
    packageJsonContent = packageJsonContent ?? zipResult.packageJsonContent;
  }

  for (const [field, value] of formData.entries()) {
    if (!(value instanceof File) || value.size <= 0) continue;
    if (field === "packageJson" || field === "sourceArchive") continue;

    const relativePath = normalizeRelativePath(
      (value as File & { webkitRelativePath?: string }).webkitRelativePath ||
        value.name
    );

    if (!relativePath || shouldSkip(relativePath)) continue;

    if (relativePath === "package.json" && !packageJsonContent) {
      packageJsonContent = await value.text();
      continue;
    }

    if (!isSupportedSourceFile(relativePath)) continue;

    sourceFiles.push({
      path: relativePath,
      content: await value.text(),
    });
  }

  return {
    packageJsonContent,
    sourceFiles,
  };
}

export async function POST(request: NextRequest) {
  if (!hasApiAccess(request)) {
    return NextResponse.json(
      {
        error:
          "Payment required. Complete checkout and unlock access from /api/access/claim.",
      },
      { status: 402 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let packageJsonContent: string;
    let sourceFiles: Array<{ path: string; content: string }>;

    if (contentType.includes("application/json")) {
      const json = await request.json();
      const parsed = jsonSchema.parse(json);
      packageJsonContent = parsed.packageJson;
      sourceFiles = parsed.sourceFiles;
    } else {
      const formData = await request.formData();
      const extracted = await extractMultipart(formData);

      if (!extracted.packageJsonContent) {
        return NextResponse.json(
          { error: "No package.json was provided or found in your upload." },
          { status: 400 }
        );
      }

      packageJsonContent = extracted.packageJsonContent;
      sourceFiles = extracted.sourceFiles;
    }

    if (!sourceFiles.length) {
      return NextResponse.json(
        { error: "No JS/TS source files found to analyze." },
        { status: 400 }
      );
    }

    const result = await analyzeDependencies({
      packageJsonContent,
      sourceFiles,
      includeSizeEstimates: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
