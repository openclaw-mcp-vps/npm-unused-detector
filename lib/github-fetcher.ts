import JSZip from "jszip";
import { Octokit } from "octokit";

import { isSupportedSourceFile } from "@/lib/dependency-analyzer";

type ParsedGithubUrl = {
  owner: string;
  repo: string;
  branch: string | null;
  subPath: string | null;
};

export type GithubProjectBundle = {
  owner: string;
  repo: string;
  branch: string;
  subPath: string | null;
  packageJsonContent: string;
  sourceFiles: Array<{ path: string; content: string }>;
};

const EXCLUDED_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  "tmp",
  "temp",
]);

const MAX_FILES = 4000;
const MAX_FILE_BYTES = 700_000;

function normalizeGithubUrl(input: string): URL {
  try {
    const url = new URL(input.trim());
    if (!["github.com", "www.github.com"].includes(url.hostname)) {
      throw new Error("URL must be on github.com");
    }
    return url;
  } catch {
    throw new Error("Enter a valid GitHub repository URL");
  }
}

export function parseGithubRepoUrl(input: string): ParsedGithubUrl {
  const url = normalizeGithubUrl(input);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("GitHub URL must include owner and repository name");
  }

  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/, "");

  let branch: string | null = null;
  let subPath: string | null = null;

  if (parts[2] === "tree" && parts[3]) {
    branch = decodeURIComponent(parts[3]);
    if (parts.length > 4) {
      subPath = decodeURIComponent(parts.slice(4).join("/"));
    }
  }

  if (parts[2] === "blob" && parts[3]) {
    branch = decodeURIComponent(parts[3]);
    if (parts.length > 5) {
      subPath = decodeURIComponent(parts.slice(4, -1).join("/"));
    }
  }

  return {
    owner,
    repo,
    branch,
    subPath,
  };
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.default_branch;
}

function shouldSkipPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  return segments.some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function resolveBasePrefix(allPaths: string[], subPath: string | null): string {
  const firstPath = allPaths.find((path) => path.includes("/"));
  const rootPrefix = firstPath ? firstPath.split("/")[0] : "";

  if (!subPath) return rootPrefix;

  const cleanSubPath = subPath.replace(/^\/+|\/+$/g, "");
  if (!cleanSubPath) return rootPrefix;
  return `${rootPrefix}/${cleanSubPath}`;
}

export async function fetchGithubProjectBundle(
  githubUrl: string
): Promise<GithubProjectBundle> {
  const parsed = parseGithubRepoUrl(githubUrl);
  const branch = parsed.branch ?? (await getDefaultBranch(parsed.owner, parsed.repo));

  const zipUrl = `https://codeload.github.com/${parsed.owner}/${parsed.repo}/zip/refs/heads/${encodeURIComponent(
    branch
  )}`;

  const zipResponse = await fetch(zipUrl, { cache: "no-store" });
  if (!zipResponse.ok) {
    throw new Error(
      `Failed to download repository archive (${zipResponse.status} ${zipResponse.statusText})`
    );
  }

  const zipBuffer = await zipResponse.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);

  const allEntries = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  if (allEntries.length === 0) {
    throw new Error("Repository archive is empty");
  }

  const basePrefix = resolveBasePrefix(allEntries, parsed.subPath);
  const packagePath = `${basePrefix}/package.json`;

  const packageEntry = zip.files[packagePath];
  if (!packageEntry) {
    throw new Error(
      parsed.subPath
        ? `No package.json found at ${parsed.subPath} on branch ${branch}`
        : `No package.json found on branch ${branch}`
    );
  }

  const packageJsonContent = await packageEntry.async("string");

  const sourceFiles: Array<{ path: string; content: string }> = [];

  for (const path of allEntries) {
    if (!path.startsWith(`${basePrefix}/`)) continue;

    const relativePath = path.slice(basePrefix.length + 1);
    if (!relativePath || shouldSkipPath(relativePath)) continue;
    if (!isSupportedSourceFile(relativePath)) continue;

    const entry = zip.files[path];
    if (!entry) continue;
    const rawEntry = entry as unknown as {
      _data?: {
        uncompressedSize?: number;
      };
    };
    if (
      rawEntry._data?.uncompressedSize &&
      rawEntry._data.uncompressedSize > MAX_FILE_BYTES
    ) {
      continue;
    }

    const content = await entry.async("string");

    sourceFiles.push({
      path: relativePath,
      content,
    });

    if (sourceFiles.length >= MAX_FILES) break;
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    branch,
    subPath: parsed.subPath,
    packageJsonContent,
    sourceFiles,
  };
}
