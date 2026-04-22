"use client";

import { FormEvent, useMemo, useState } from "react";
import { Github, LoaderCircle, UploadCloud, WandSparkles } from "lucide-react";

import { ResultsDisplay } from "@/components/ResultsDisplay";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type FileUploadProps = {
  hasAccess: boolean;
  paymentLink: string | undefined;
};

type ScanState = {
  result: AnalysisResult | null;
  sourceLabel: string;
};

export function FileUpload({ hasAccess, paymentLink }: FileUploadProps) {
  const [mode, setMode] = useState<"upload" | "github">("upload");
  const [githubUrl, setGithubUrl] = useState("");
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [sourceArchive, setSourceArchive] = useState<File | null>(null);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState>({ result: null, sourceLabel: "" });

  const canSubmitUpload = useMemo(
    () => Boolean(packageFile && (sourceArchive || folderFiles.length > 0)),
    [packageFile, sourceArchive, folderFiles.length]
  );

  const runGithubScan = async () => {
    const response = await fetch("/api/github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: githubUrl.trim() }),
    });

    const body = (await response.json()) as
      | { analysis?: AnalysisResult; source?: { owner?: string; repo?: string; branch?: string }; error?: string }
      | { error?: string };

    if (!response.ok || !body || !("analysis" in body) || !body.analysis) {
      throw new Error(body?.error || "Failed to scan this GitHub repository.");
    }

    const source = body.source;
    const sourceLabel = source
      ? `${source.owner}/${source.repo} (${source.branch})`
      : githubUrl.trim();

    setScan({
      result: body.analysis,
      sourceLabel,
    });
  };

  const runUploadScan = async () => {
    const formData = new FormData();

    if (!packageFile) {
      throw new Error("Attach package.json to run an upload scan.");
    }

    formData.append("packageJson", packageFile);

    if (sourceArchive) {
      formData.append("sourceArchive", sourceArchive);
    }

    for (const file of folderFiles) {
      if ((file as File & { webkitRelativePath?: string }).webkitRelativePath) {
        formData.append("sourceFiles", file, (file as File & { webkitRelativePath?: string }).webkitRelativePath);
      } else {
        formData.append("sourceFiles", file, file.name);
      }
    }

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const body = (await response.json()) as AnalysisResult & { error?: string };

    if (!response.ok) {
      throw new Error(body?.error || "Upload scan failed.");
    }

    setScan({
      result: body,
      sourceLabel: packageFile.name,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    try {
      if (mode === "github") {
        if (!githubUrl.trim()) {
          throw new Error("Paste a GitHub repository URL before scanning.");
        }
        await runGithubScan();
      } else {
        if (!canSubmitUpload) {
          throw new Error(
            "Upload package.json and either a source zip or a source folder before scanning."
          );
        }
        await runUploadScan();
      }

      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Scan failed.");
    }
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Tool access is locked</CardTitle>
          <CardDescription>
            Checkout is required before you can run scans. After paying, return through your
            Stripe completion URL to set the secure access cookie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            Unlock Scanner
          </a>
          <p className="text-sm text-muted">
            Configure your Stripe Payment Link completion URL to
            {" "}
            <code>/api/access/claim?session_id={'{CHECKOUT_SESSION_ID}'}</code>
            {" "}
            so this browser is automatically unlocked after purchase.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Run a dependency scan</CardTitle>
          <CardDescription>
            Upload `package.json` + source files or point to a public GitHub repo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode === "upload" ? "default" : "secondary"}
                onClick={() => setMode("upload")}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload files
              </Button>
              <Button
                type="button"
                variant={mode === "github" ? "default" : "secondary"}
                onClick={() => setMode("github")}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub URL
              </Button>
            </div>

            {mode === "upload" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-muted">package.json</span>
                  <Input
                    type="file"
                    accept="application/json"
                    onChange={(event) =>
                      setPackageFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-muted">Source archive (.zip)</span>
                  <Input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(event) =>
                      setSourceArchive(event.target.files?.[0] ?? null)
                    }
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm text-muted">Or source folder (src/, app/, etc.)</span>
                  <input
                    className="flex h-10 w-full cursor-pointer rounded-md border border-border bg-[#0b1118] px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-text"
                    type="file"
                    multiple
                    {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setFolderFiles(files);
                    }}
                  />
                </label>

                <div className="sm:col-span-2">
                  <Badge variant="outline">
                    {folderFiles.length} folder file{folderFiles.length === 1 ? "" : "s"} selected
                  </Badge>
                </div>
              </div>
            ) : (
              <label className="space-y-2">
                <span className="text-sm text-muted">GitHub repository URL</span>
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={(event) => setGithubUrl(event.target.value)}
                />
                <Textarea
                  readOnly
                  value="Supports root repos and /tree/{branch}/{path} URLs for monorepo packages."
                  className="min-h-0 resize-none bg-transparent px-0 py-0 text-xs text-muted"
                />
              </label>
            )}

            {errorMessage ? (
              <p className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Running scan...
                </>
              ) : (
                <>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Analyze Dependencies
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scan.result ? (
        <ResultsDisplay result={scan.result} sourceLabel={scan.sourceLabel} />
      ) : null}
    </div>
  );
}
