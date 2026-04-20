"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface GithubInputProps {
  enabled: boolean;
}

export function GithubInput({ enabled }: GithubInputProps) {
  const router = useRouter();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runGithubScan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!enabled) {
      setErrorMessage("Purchase access to run scans.");
      return;
    }

    if (!repositoryUrl.trim()) {
      setErrorMessage("Paste a GitHub repository URL first.");
      return;
    }

    setErrorMessage(null);
    setIsScanning(true);

    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: repositoryUrl.trim() }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "GitHub scan failed.");
      }

      router.push(`/results/${payload.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not scan repository.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle>Scan a GitHub repository</CardTitle>
        <CardDescription>
          Paste a public repository URL. We fetch package.json plus app/src/pages/lib files and run AST import analysis
          server-side.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={runGithubScan} className="space-y-3">
          <label htmlFor="github-url" className="text-sm text-slate-300">
            GitHub URL
          </label>
          <Input
            id="github-url"
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="https://github.com/owner/repo"
            autoComplete="off"
            spellCheck={false}
          />

          {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

          <Button type="submit" disabled={isScanning || !enabled}>
            {isScanning ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Github className="mr-2 size-4" />}
            {isScanning ? "Scanning repository..." : "Scan GitHub Repository"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
