import { Octokit } from "octokit";
import { isScannableSourceFile } from "@/lib/ast-analyzer";

interface GitHubCoordinates {
  owner: string;
  repo: string;
  branch?: string;
}

export interface GitHubProjectSnapshot {
  owner: string;
  repo: string;
  branch: string;
  projectName: string;
  packageJsonText: string;
  sourceFiles: Record<string, string>;
}

const MAX_FILE_COUNT = 600;
const MAX_FILE_SIZE_BYTES = 300_000;
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", "public"]);

function parseGitHubUrl(repositoryUrl: string): GitHubCoordinates {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(repositoryUrl);
  } catch {
    throw new Error("Invalid URL. Use a full GitHub repository URL.");
  }

  if (!parsedUrl.hostname.endsWith("github.com")) {
    throw new Error("Only github.com URLs are supported.");
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Repository URL must include owner and repository name.");
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");

  if (!owner || !repo) {
    throw new Error("Could not parse owner/repo from the URL.");
  }

  if (segments[2] === "tree" && segments[3]) {
    return { owner, repo, branch: decodeURIComponent(segments[3]) };
  }

  return { owner, repo };
}

function shouldSkipDirectory(path: string) {
  const segments = path.split("/");
  return segments.some((segment) => IGNORED_DIRS.has(segment));
}

function decodeGithubFileContent(content: string) {
  return Buffer.from(content, "base64").toString("utf8");
}

export async function fetchGitHubProjectSnapshot(repositoryUrl: string): Promise<GitHubProjectSnapshot> {
  const coordinates = parseGitHubUrl(repositoryUrl);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const repository = await octokit.rest.repos.get({
    owner: coordinates.owner,
    repo: coordinates.repo,
  });

  const branch = coordinates.branch ?? repository.data.default_branch;

  const packageJsonResponse = await octokit.rest.repos.getContent({
    owner: coordinates.owner,
    repo: coordinates.repo,
    path: "package.json",
    ref: branch,
  });

  if (Array.isArray(packageJsonResponse.data) || packageJsonResponse.data.type !== "file") {
    throw new Error("Could not read package.json from this repository.");
  }

  const packageJsonText = decodeGithubFileContent(packageJsonResponse.data.content);
  const sourceFiles: Record<string, string> = {};

  const queue = ["src", "app", "pages", "lib"];
  const visited = new Set<string>();

  while (queue.length > 0 && Object.keys(sourceFiles).length < MAX_FILE_COUNT) {
    const currentPath = queue.shift();
    if (!currentPath || visited.has(currentPath) || shouldSkipDirectory(currentPath)) {
      continue;
    }

    visited.add(currentPath);

    try {
      const directoryResponse = await octokit.rest.repos.getContent({
        owner: coordinates.owner,
        repo: coordinates.repo,
        path: currentPath,
        ref: branch,
      });

      if (!Array.isArray(directoryResponse.data)) {
        continue;
      }

      for (const item of directoryResponse.data) {
        if (item.type === "dir") {
          if (!shouldSkipDirectory(item.path)) {
            queue.push(item.path);
          }
          continue;
        }

        if (item.type !== "file") {
          continue;
        }

        if (!isScannableSourceFile(item.path) || item.size > MAX_FILE_SIZE_BYTES) {
          continue;
        }

        const fileResponse = await octokit.rest.repos.getContent({
          owner: coordinates.owner,
          repo: coordinates.repo,
          path: item.path,
          ref: branch,
        });

        if (Array.isArray(fileResponse.data) || fileResponse.data.type !== "file") {
          continue;
        }

        sourceFiles[item.path] = decodeGithubFileContent(fileResponse.data.content);

        if (Object.keys(sourceFiles).length >= MAX_FILE_COUNT) {
          break;
        }
      }
    } catch {
      // Ignore missing folders like pages/ in app-router-only repos.
    }
  }

  if (Object.keys(sourceFiles).length === 0) {
    throw new Error(
      "No source files were found in src/, app/, pages/, or lib/. Upload files manually for custom project layouts.",
    );
  }

  return {
    owner: coordinates.owner,
    repo: coordinates.repo,
    branch,
    projectName: repository.data.full_name,
    packageJsonText,
    sourceFiles,
  };
}
