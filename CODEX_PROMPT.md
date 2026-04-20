# Build Task: npm-unused-detector

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: npm-unused-detector
HEADLINE: NPM Unused Detector — scan your package.json for deps you never import
WHAT: Paste GitHub URL or upload package.json + src/. AST scans source for every import, cross-references deps + devDeps, outputs removable list + kb saved.
WHY: depcheck CLI is noisy + slow. Hosted + fast + visual diff = solo-dev time-save.
WHO PAYS: Indie devs wanting to trim npm bloat
NICHE: devtools
PRICE: $$3 per scan, $12/mo unlimited/mo

ARCHITECTURE SPEC:
Next.js app with file upload/GitHub integration that performs AST analysis on JavaScript/TypeScript files to detect unused dependencies. Uses Lemon Squeezy for pay-per-scan and subscription billing with results displayed in an interactive dashboard.

PLANNED FILES:
- app/page.tsx
- app/scan/page.tsx
- app/results/[id]/page.tsx
- app/api/scan/route.ts
- app/api/github/route.ts
- app/api/webhooks/lemonsqueezy/route.ts
- lib/ast-analyzer.ts
- lib/dependency-checker.ts
- lib/github-client.ts
- lib/lemonsqueezy.ts
- lib/database.ts
- components/file-upload.tsx
- components/github-input.tsx
- components/results-table.tsx
- components/pricing-card.tsx

DEPENDENCIES: next, @next/font, tailwindcss, @tailwindcss/forms, typescript, @types/node, prisma, @prisma/client, @lemonsqueezy/lemonsqueezy.js, @babel/parser, @babel/traverse, @babel/types, acorn, acorn-walk, jszip, octokit, zod, react-dropzone, lucide-react

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
