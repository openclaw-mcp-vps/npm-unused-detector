export type DependencyEntry = {
  name: string;
  versionRange: string;
  estimatedSizeKb: number | null;
};

export type AnalysisResult = {
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

export type ScanApiResponse = AnalysisResult | { source: unknown; analysis: AnalysisResult };
