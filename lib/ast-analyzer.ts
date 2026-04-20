import { parse as parseAcorn } from "acorn";
import * as acornWalk from "acorn-walk";
import { parse as parseBabel } from "@babel/parser";
import traverse from "@babel/traverse";
import type * as t from "@babel/types";
import type { Node as AcornNode } from "acorn";
import { builtinModules } from "node:module";
import path from "node:path";

export interface AnalysisResult {
  importedPackages: string[];
  filesScanned: number;
  parseErrors: string[];
}

const SCANNABLE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const NODE_BUILTINS = new Set(
  builtinModules
    .flatMap((moduleName) => [moduleName, moduleName.replace(/^node:/, "")])
    .map((moduleName) => moduleName.replace(/^node:/, "")),
);

export function isScannableSourceFile(filePath: string) {
  if (filePath.endsWith(".d.ts")) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  return SCANNABLE_EXTENSIONS.has(extension);
}

function normalizePackageName(specifier: string): string | null {
  const cleaned = specifier.trim().split("?")[0]?.split("#")[0] ?? "";

  if (!cleaned || cleaned.startsWith(".") || cleaned.startsWith("/") || cleaned.startsWith("@/") || cleaned.startsWith("#")) {
    return null;
  }

  if (/^[a-zA-Z]+:\/\//.test(cleaned)) {
    return null;
  }

  const withoutNodePrefix = cleaned.startsWith("node:") ? cleaned.slice(5) : cleaned;
  const isScoped = withoutNodePrefix.startsWith("@");
  const parts = withoutNodePrefix.split("/").filter(Boolean);

  const packageName = isScoped ? parts.slice(0, 2).join("/") : parts[0];
  if (!packageName) {
    return null;
  }

  if (NODE_BUILTINS.has(packageName) || NODE_BUILTINS.has(withoutNodePrefix)) {
    return null;
  }

  return packageName;
}

function collectFromBabelAst(ast: t.File) {
  const imported = new Set<string>();

  const maybeCollect = (value: string) => {
    const normalized = normalizePackageName(value);
    if (normalized) {
      imported.add(normalized);
    }
  };

  traverse(ast, {
    ImportDeclaration(pathValue) {
      maybeCollect(pathValue.node.source.value);
    },
    ExportNamedDeclaration(pathValue) {
      if (pathValue.node.source?.value) {
        maybeCollect(pathValue.node.source.value);
      }
    },
    ExportAllDeclaration(pathValue) {
      maybeCollect(pathValue.node.source.value);
    },
    CallExpression(pathValue) {
      const { node } = pathValue;

      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments.length > 0 &&
        node.arguments[0]?.type === "StringLiteral"
      ) {
        maybeCollect(node.arguments[0].value);
      }

      if (
        node.callee.type === "Import" &&
        node.arguments.length > 0 &&
        node.arguments[0]?.type === "StringLiteral"
      ) {
        maybeCollect(node.arguments[0].value);
      }
    },
  });

  return imported;
}

function collectFromAcornAst(ast: AcornNode) {
  const imported = new Set<string>();

  const maybeCollect = (value: string) => {
    const normalized = normalizePackageName(value);
    if (normalized) {
      imported.add(normalized);
    }
  };

  acornWalk.simple(ast, {
    ImportDeclaration(node: AcornNode) {
      const importNode = node as AcornNode & { source?: { value?: string } };
      const source = importNode.source?.value;
      if (typeof source === "string") {
        maybeCollect(source);
      }
    },
    ExportNamedDeclaration(node: AcornNode) {
      const exportNode = node as AcornNode & { source?: { value?: string } };
      const source = exportNode.source?.value;
      if (typeof source === "string") {
        maybeCollect(source);
      }
    },
    ExportAllDeclaration(node: AcornNode) {
      const exportNode = node as AcornNode & { source?: { value?: string } };
      const source = exportNode.source?.value;
      if (typeof source === "string") {
        maybeCollect(source);
      }
    },
    ImportExpression(node: AcornNode) {
      const importNode = node as AcornNode & { source?: { type?: string; value?: string } };
      if (importNode.source?.type === "Literal" && typeof importNode.source.value === "string") {
        maybeCollect(importNode.source.value);
      }
    },
    CallExpression(node: AcornNode) {
      const callNode = node as AcornNode & {
        callee?: { type?: string; name?: string };
        arguments?: Array<{ type?: string; value?: string }>;
      };

      if (
        callNode.callee?.type === "Identifier" &&
        callNode.callee.name === "require" &&
        callNode.arguments?.[0]?.type === "Literal" &&
        typeof callNode.arguments[0].value === "string"
      ) {
        maybeCollect(callNode.arguments[0].value);
      }
    },
  });

  return imported;
}

function extractImportsFromCode(code: string) {
  try {
    const ast = parseBabel(code, {
      sourceType: "unambiguous",
      errorRecovery: true,
      plugins: [
        "typescript",
        "jsx",
        "dynamicImport",
        "importMeta",
        "topLevelAwait",
        "decorators-legacy",
      ],
    });

    return {
      imports: collectFromBabelAst(ast),
      parseError: null,
    };
  } catch (babelError) {
    try {
      const acornAst = parseAcorn(code, {
        ecmaVersion: "latest",
        sourceType: "module",
        allowHashBang: true,
      });

      return {
        imports: collectFromAcornAst(acornAst as AcornNode),
        parseError: null,
      };
    } catch (acornError) {
      return {
        imports: new Set<string>(),
        parseError:
          acornError instanceof Error
            ? acornError.message
            : babelError instanceof Error
              ? babelError.message
              : "Unknown parser error",
      };
    }
  }
}

export function analyzeProjectFiles(files: Record<string, string>): AnalysisResult {
  const importedPackages = new Set<string>();
  const parseErrors: string[] = [];
  let filesScanned = 0;

  for (const [filePath, content] of Object.entries(files)) {
    if (!isScannableSourceFile(filePath)) {
      continue;
    }

    filesScanned += 1;

    const extraction = extractImportsFromCode(content);
    extraction.imports.forEach((packageName) => importedPackages.add(packageName));

    if (extraction.parseError) {
      parseErrors.push(`${filePath}: ${extraction.parseError}`);
    }
  }

  return {
    importedPackages: [...importedPackages].sort((a, b) => a.localeCompare(b)),
    filesScanned,
    parseErrors,
  };
}
