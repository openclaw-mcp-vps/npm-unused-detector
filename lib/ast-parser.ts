import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import * as tsEslintParser from "@typescript-eslint/parser";
import { Parser as AcornParser } from "acorn";
import * as acornWalk from "acorn-walk";

export type SourceFile = {
  path: string;
  content: string;
};

const BABEL_PLUGINS: babelParser.ParserPlugin[] = [
  "typescript",
  "jsx",
  "importAttributes",
  "dynamicImport",
  "classProperties",
  "decorators-legacy",
  "topLevelAwait",
];

function collectFromBabel(code: string): Set<string> {
  const imports = new Set<string>();
  const ast = babelParser.parse(code, {
    sourceType: "unambiguous",
    allowImportExportEverywhere: true,
    plugins: BABEL_PLUGINS,
    errorRecovery: true,
  });

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (source) imports.add(source);
    },
    ExportNamedDeclaration(path) {
      const source = path.node.source?.value;
      if (source) imports.add(source);
    },
    ExportAllDeclaration(path) {
      const source = path.node.source.value;
      if (source) imports.add(source);
    },
    CallExpression(path) {
      const { callee, arguments: args } = path.node;
      if (
        callee.type === "Identifier" &&
        callee.name === "require" &&
        args.length > 0 &&
        args[0]?.type === "StringLiteral"
      ) {
        imports.add(args[0].value);
      }
    },
    Import(path) {
      const callExpr = path.parentPath.node;
      if (
        callExpr.type === "CallExpression" &&
        callExpr.arguments[0]?.type === "StringLiteral"
      ) {
        imports.add(callExpr.arguments[0].value);
      }
    },
  });

  return imports;
}

function collectFromTypeScriptESLint(code: string): Set<string> {
  const imports = new Set<string>();
  const ast = tsEslintParser.parse(code, {
    sourceType: "module",
    ecmaVersion: "latest",
    ecmaFeatures: {
      jsx: true,
    },
    loc: false,
    range: false,
    tokens: false,
    comment: false,
    errorOnUnknownASTType: false,
  }) as unknown as Record<string, unknown>;

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    const current = node as Record<string, unknown>;
    const type = current.type;

    if (type === "ImportDeclaration") {
      const source = current.source as Record<string, unknown> | undefined;
      if (source && typeof source.value === "string") imports.add(source.value);
    }

    if (type === "ExportNamedDeclaration" || type === "ExportAllDeclaration") {
      const source = current.source as Record<string, unknown> | undefined;
      if (source && typeof source.value === "string") imports.add(source.value);
    }

    if (type === "CallExpression") {
      const callee = current.callee as Record<string, unknown> | undefined;
      const args = current.arguments as Array<Record<string, unknown>> | undefined;
      if (
        callee?.type === "Identifier" &&
        callee.name === "require" &&
        args?.[0]?.type === "Literal" &&
        typeof args[0].value === "string"
      ) {
        imports.add(args[0].value as string);
      }
      if (
        callee?.type === "Import" &&
        args?.[0]?.type === "Literal" &&
        typeof args[0].value === "string"
      ) {
        imports.add(args[0].value as string);
      }
    }

    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else if (value && typeof value === "object") {
        visit(value);
      }
    }
  };

  visit(ast);
  return imports;
}

function collectFromAcorn(code: string): Set<string> {
  const imports = new Set<string>();

  const ast = AcornParser.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowHashBang: true,
  });

  acornWalk.simple(ast, {
    ImportDeclaration(node: any) {
      const source = (node as { source?: { value?: unknown } }).source?.value;
      if (typeof source === "string") imports.add(source);
    },
    ExportNamedDeclaration(node: any) {
      const source = (node as { source?: { value?: unknown } }).source?.value;
      if (typeof source === "string") imports.add(source);
    },
    ExportAllDeclaration(node: any) {
      const source = (node as { source?: { value?: unknown } }).source?.value;
      if (typeof source === "string") imports.add(source);
    },
    CallExpression(node: any) {
      const call = node as {
        callee?: { type?: string; name?: string };
        arguments?: Array<{ type?: string; value?: unknown }>;
      };
      if (
        call.callee?.type === "Identifier" &&
        call.callee.name === "require" &&
        call.arguments?.[0]?.type === "Literal" &&
        typeof call.arguments[0].value === "string"
      ) {
        imports.add(call.arguments[0].value as string);
      }
    },
    ImportExpression(node: any) {
      const source = (node as { source?: { type?: string; value?: unknown } }).source;
      if (source?.type === "Literal" && typeof source.value === "string") {
        imports.add(source.value);
      }
    },
  });

  return imports;
}

export function extractImportSpecifiers(code: string, filePath = "unknown"): string[] {
  if (!code.trim()) return [];

  const parsers: Array<() => Set<string>> = [
    () => collectFromBabel(code),
    () => collectFromTypeScriptESLint(code),
    () => collectFromAcorn(code),
  ];

  const errors: string[] = [];

  for (const parseWith of parsers) {
    try {
      return Array.from(parseWith());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  throw new Error(
    `Unable to parse ${filePath}. Tried Babel, @typescript-eslint/parser, and Acorn. Last errors: ${errors.join(
      " | "
    )}`
  );
}

export function extractImportSpecifiersFromFiles(files: SourceFile[]): {
  imports: Set<string>;
  fileErrors: Array<{ path: string; error: string }>;
} {
  const imports = new Set<string>();
  const fileErrors: Array<{ path: string; error: string }> = [];

  for (const file of files) {
    try {
      const specs = extractImportSpecifiers(file.content, file.path);
      for (const spec of specs) imports.add(spec);
    } catch (error) {
      fileErrors.push({
        path: file.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { imports, fileErrors };
}
