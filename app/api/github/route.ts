import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasApiAccess } from "@/lib/access";
import { analyzeDependencies } from "@/lib/dependency-analyzer";
import { fetchGithubProjectBundle } from "@/lib/github-fetcher";

const bodySchema = z.object({
  url: z.string().url(),
});

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
    const json = await request.json();
    const { url } = bodySchema.parse(json);

    const bundle = await fetchGithubProjectBundle(url);
    const analysis = await analyzeDependencies({
      packageJsonContent: bundle.packageJsonContent,
      sourceFiles: bundle.sourceFiles,
      includeSizeEstimates: true,
    });

    return NextResponse.json({
      source: {
        owner: bundle.owner,
        repo: bundle.repo,
        branch: bundle.branch,
        subPath: bundle.subPath,
      },
      analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
