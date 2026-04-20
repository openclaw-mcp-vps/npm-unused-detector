import { z } from "zod";

export const packageJsonSchema = z.object({
  name: z.string().optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
});

export type ParsedPackageJson = z.infer<typeof packageJsonSchema>;

export interface UnusedDependency {
  name: string;
  version: string;
  scope: "dependencies" | "devDependencies";
  estimatedKb: number;
  reason: string;
}

export interface DependencyReport {
  projectName: string;
  generatedAt: string;
  filesScanned: number;
  importedPackages: string[];
  usedDependencies: string[];
  usedDevDependencies: string[];
  unusedDependencies: UnusedDependency[];
  unusedDevDependencies: UnusedDependency[];
  ignoredDevDependencies: string[];
  missingDependencies: string[];
  parseErrors: string[];
  totalEstimatedKbSaved: number;
}

interface BuildReportInput {
  packageJson: ParsedPackageJson;
  importedPackages: string[];
  filesScanned: number;
  parseErrors: string[];
}

const ALWAYS_IGNORE_DEV_DEPENDENCY = new Set([
  "typescript",
  "ts-node",
  "tsup",
  "tsx",
  "eslint",
  "eslint-config-next",
  "prettier",
  "tailwindcss",
  "postcss",
  "autoprefixer",
  "@tailwindcss/postcss",
  "@tailwindcss/forms",
  "vite",
  "vitest",
  "jest",
  "next",
]);

function shouldIgnoreDevDependency(packageName: string) {
  if (ALWAYS_IGNORE_DEV_DEPENDENCY.has(packageName)) {
    return true;
  }

  if (packageName.startsWith("@types/")) {
    return true;
  }

  if (packageName.startsWith("eslint-") || packageName.startsWith("@eslint/")) {
    return true;
  }

  return false;
}

async function estimatePackageSizeKb(packageName: string): Promise<number> {
  try {
    const encodedName = encodeURIComponent(packageName);
    const response = await fetch(`https://registry.npmjs.org/${encodedName}/latest`, {
      signal: AbortSignal.timeout(2800),
    });

    if (!response.ok) {
      return 0;
    }

    const payload = (await response.json()) as { dist?: { unpackedSize?: number } };
    const unpackedSize = payload.dist?.unpackedSize;

    if (typeof unpackedSize !== "number" || Number.isNaN(unpackedSize)) {
      return 0;
    }

    return Math.round(unpackedSize / 1024);
  } catch {
    return 0;
  }
}

async function estimatePackageSizes(packageNames: string[]) {
  const deduped = [...new Set(packageNames)];
  const sizes = await Promise.all(
    deduped.map(async (packageName) => [packageName, await estimatePackageSizeKb(packageName)] as const),
  );

  return Object.fromEntries(sizes);
}

function createUnusedEntry(
  packageName: string,
  version: string,
  scope: "dependencies" | "devDependencies",
  estimatedKb: number,
): UnusedDependency {
  return {
    name: packageName,
    version,
    scope,
    estimatedKb,
    reason:
      scope === "dependencies"
        ? "Never imported in scanned runtime source files"
        : "Not imported by app code and not recognized as a build/test tool",
  };
}

export function parsePackageJsonText(packageJsonText: string) {
  return packageJsonSchema.parse(JSON.parse(packageJsonText));
}

export async function buildDependencyReport(input: BuildReportInput): Promise<DependencyReport> {
  const dependencies = input.packageJson.dependencies ?? {};
  const devDependencies = input.packageJson.devDependencies ?? {};
  const importedSet = new Set(input.importedPackages);

  const dependencyNames = Object.keys(dependencies).sort((a, b) => a.localeCompare(b));
  const devDependencyNames = Object.keys(devDependencies).sort((a, b) => a.localeCompare(b));

  const usedDependencies = dependencyNames.filter((dep) => importedSet.has(dep));
  const unusedDependencyNames = dependencyNames.filter((dep) => !importedSet.has(dep));

  const usedDevDependencies = devDependencyNames.filter((dep) => importedSet.has(dep));
  const ignoredDevDependencies = devDependencyNames.filter(
    (dep) => !importedSet.has(dep) && shouldIgnoreDevDependency(dep),
  );
  const unusedDevDependencyNames = devDependencyNames.filter(
    (dep) => !importedSet.has(dep) && !shouldIgnoreDevDependency(dep),
  );

  const knownPackages = new Set([...dependencyNames, ...devDependencyNames]);
  const missingDependencies = input.importedPackages.filter((dep) => !knownPackages.has(dep));

  const sizeMap = await estimatePackageSizes([...unusedDependencyNames, ...unusedDevDependencyNames]);

  const unusedDependencies = unusedDependencyNames.map((dep) =>
    createUnusedEntry(dep, dependencies[dep] ?? "unknown", "dependencies", sizeMap[dep] ?? 0),
  );
  const unusedDevDependencies = unusedDevDependencyNames.map((dep) =>
    createUnusedEntry(dep, devDependencies[dep] ?? "unknown", "devDependencies", sizeMap[dep] ?? 0),
  );

  const totalEstimatedKbSaved = [...unusedDependencies, ...unusedDevDependencies].reduce(
    (total, item) => total + item.estimatedKb,
    0,
  );

  return {
    projectName: input.packageJson.name ?? "Unnamed project",
    generatedAt: new Date().toISOString(),
    filesScanned: input.filesScanned,
    importedPackages: input.importedPackages,
    usedDependencies,
    usedDevDependencies,
    unusedDependencies,
    unusedDevDependencies,
    ignoredDevDependencies,
    missingDependencies,
    parseErrors: input.parseErrors,
    totalEstimatedKbSaved,
  };
}
