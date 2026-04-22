import { builtinModules } from "node:module";

import semver from "semver";
import { z } from "zod";

import {
  type SourceFile,
  extractImportSpecifiersFromFiles,
} from "@/lib/ast-parser";

const packageJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

const ALL_BUILTINS = new Set(
  builtinModules.flatMap((mod) => [mod, mod.replace(/^node:/, "")])
);

export type DependencyEntry = {
  name: string;
  versionRange: string;
  estimatedSizeKb: number | null;
};

export type AnalyzerResult = {
  projectName: string | null;
  scannedFiles: number;
  fileParseErrors: Array<{ path: string; error: string }>;
  importSpecifiers: string[];
  usedPackages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  unusedDependencies: DependencyEntry[];
  unusedDevDependencies: DependencyEntry[];
  totalEstimatedSavingsKb: number;
  uninstallCommand: string | null;
  uninstallDevCommand: string | null;
};

export type AnalyzerInput = {
  packageJsonContent: string;
  sourceFiles: SourceFile[];
  includeSizeEstimates?: boolean;
};

function toRootPackage(specifier: string): string | null {
  if (!specifier) return null;

  const withoutQuery = specifier.split(/[?#]/)[0]?.trim();
  if (!withoutQuery) return null;

  if (
    withoutQuery.startsWith(".") ||
    withoutQuery.startsWith("/") ||
    withoutQuery.startsWith("~/") ||
    withoutQuery.startsWith("@/") ||
    withoutQuery.startsWith("#")
  ) {
    return null;
  }

  const cleaned = withoutQuery.startsWith("node:")
    ? withoutQuery.slice(5)
    : withoutQuery;

  if (ALL_BUILTINS.has(cleaned)) return null;

  if (cleaned.startsWith("@")) {
    const [scope, pkg] = cleaned.split("/");
    if (!scope || !pkg) return null;
    return `${scope}/${pkg}`;
  }

  return cleaned.split("/")[0] ?? null;
}

function sumKnownSizes(entries: DependencyEntry[]): number {
  return entries.reduce((total, item) => {
    if (item.estimatedSizeKb === null) return total;
    return total + item.estimatedSizeKb;
  }, 0);
}

async function getRegistrySizeKb(
  packageName: string,
  versionRange: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      {
        headers: {
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      versions?: Record<string, { dist?: { unpackedSize?: number } }>;
      "dist-tags"?: { latest?: string };
    };

    const minVersion = semver.minVersion(versionRange)?.version;
    const candidateVersion =
      (minVersion && payload.versions?.[minVersion] && minVersion) ||
      payload["dist-tags"]?.latest;

    if (!candidateVersion) return null;

    const sizeBytes = payload.versions?.[candidateVersion]?.dist?.unpackedSize;
    if (typeof sizeBytes !== "number") return null;

    return Math.round((sizeBytes / 1024) * 10) / 10;
  } catch {
    return null;
  }
}

async function attachSizeEstimates(
  entries: Array<{ name: string; versionRange: string }>
): Promise<DependencyEntry[]> {
  const results = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      estimatedSizeKb: await getRegistrySizeKb(entry.name, entry.versionRange),
    }))
  );

  return results;
}

export async function analyzeDependencies({
  packageJsonContent,
  sourceFiles,
  includeSizeEstimates = true,
}: AnalyzerInput): Promise<AnalyzerResult> {
  let packageJsonData: z.infer<typeof packageJsonSchema>;

  try {
    const parsed = JSON.parse(packageJsonContent);
    packageJsonData = packageJsonSchema.parse(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid package.json format";
    throw new Error(`Invalid package.json: ${message}`);
  }

  const dependencies = packageJsonData.dependencies ?? {};
  const devDependencies = packageJsonData.devDependencies ?? {};

  const { imports, fileErrors } = extractImportSpecifiersFromFiles(sourceFiles);

  const usedPackages = new Set<string>();
  for (const specifier of imports) {
    const pkg = toRootPackage(specifier);
    if (!pkg) continue;
    usedPackages.add(pkg);
  }

  const dependencyEntries = Object.entries(dependencies).map(([name, version]) => ({
    name,
    versionRange: version,
  }));
  const devDependencyEntries = Object.entries(devDependencies).map(
    ([name, version]) => ({
      name,
      versionRange: version,
    })
  );

  const rawUnusedDeps = dependencyEntries.filter((dep) => !usedPackages.has(dep.name));
  const rawUnusedDevDeps = devDependencyEntries.filter(
    (dep) => !usedPackages.has(dep.name)
  );

  const unusedDependencies = includeSizeEstimates
    ? await attachSizeEstimates(rawUnusedDeps)
    : rawUnusedDeps.map((dep) => ({ ...dep, estimatedSizeKb: null }));

  const unusedDevDependencies = includeSizeEstimates
    ? await attachSizeEstimates(rawUnusedDevDeps)
    : rawUnusedDevDeps.map((dep) => ({ ...dep, estimatedSizeKb: null }));

  const totalEstimatedSavingsKb =
    sumKnownSizes(unusedDependencies) + sumKnownSizes(unusedDevDependencies);

  return {
    projectName: packageJsonData.name ?? null,
    scannedFiles: sourceFiles.length,
    fileParseErrors: fileErrors,
    importSpecifiers: Array.from(imports).sort((a, b) => a.localeCompare(b)),
    usedPackages: Array.from(usedPackages).sort((a, b) => a.localeCompare(b)),
    dependencies,
    devDependencies,
    unusedDependencies,
    unusedDevDependencies,
    totalEstimatedSavingsKb,
    uninstallCommand:
      unusedDependencies.length > 0
        ? `npm uninstall ${unusedDependencies.map((dep) => dep.name).join(" ")}`
        : null,
    uninstallDevCommand:
      unusedDevDependencies.length > 0
        ? `npm uninstall -D ${unusedDevDependencies
            .map((dep) => dep.name)
            .join(" ")}`
        : null,
  };
}

export function isSupportedSourceFile(filePath: string): boolean {
  const lowered = filePath.toLowerCase();
  return (
    lowered.endsWith(".js") ||
    lowered.endsWith(".jsx") ||
    lowered.endsWith(".ts") ||
    lowered.endsWith(".tsx") ||
    lowered.endsWith(".mjs") ||
    lowered.endsWith(".cjs") ||
    lowered.endsWith(".mts") ||
    lowered.endsWith(".cts")
  );
}
