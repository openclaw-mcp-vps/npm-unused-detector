"use client";

import { useMemo, useState } from "react";
import type { UnusedDependency } from "@/lib/dependency-checker";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ResultsTableProps {
  unusedDependencies: UnusedDependency[];
  unusedDevDependencies: UnusedDependency[];
  missingDependencies: string[];
}

type ScopeFilter = "all" | "dependencies" | "devDependencies";

type SortMode = "size" | "name";

export function ResultsTable({ unusedDependencies, unusedDevDependencies, missingDependencies }: ResultsTableProps) {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("size");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const combined = [...unusedDependencies, ...unusedDevDependencies];

    const filtered = combined.filter((item) => {
      if (scopeFilter !== "all" && item.scope !== scopeFilter) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      return item.name.toLowerCase().includes(query.trim().toLowerCase());
    });

    if (sortMode === "name") {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered.sort((a, b) => b.estimatedKb - a.estimatedKb);
  }, [query, scopeFilter, sortMode, unusedDependencies, unusedDevDependencies]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setScopeFilter("all")}
          className={`rounded-full px-3 py-1 text-xs ${
            scopeFilter === "all" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setScopeFilter("dependencies")}
          className={`rounded-full px-3 py-1 text-xs ${
            scopeFilter === "dependencies" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"
          }`}
        >
          dependencies
        </button>
        <button
          onClick={() => setScopeFilter("devDependencies")}
          className={`rounded-full px-3 py-1 text-xs ${
            scopeFilter === "devDependencies" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"
          }`}
        >
          devDependencies
        </button>

        <button
          onClick={() => setSortMode(sortMode === "size" ? "name" : "size")}
          className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
        >
          Sort: {sortMode === "size" ? "Estimated KB" : "Package Name"}
        </button>

        <div className="min-w-56 flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter package name"
            className="h-8"
          />
        </div>
      </div>

      <Table className="border border-slate-800">
        <TableHeader>
          <TableRow>
            <TableHead>Package</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Estimated KB</TableHead>
            <TableHead>Why removable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={`${row.scope}:${row.name}`}>
                <TableCell className="font-medium text-slate-100">{row.name}</TableCell>
                <TableCell>
                  <Badge variant={row.scope === "dependencies" ? "default" : "muted"}>{row.scope}</Badge>
                </TableCell>
                <TableCell className="text-slate-300">{row.version}</TableCell>
                <TableCell className="text-right text-slate-200">{row.estimatedKb.toLocaleString()}</TableCell>
                <TableCell className="text-slate-300">{row.reason}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-400">
                No dependencies match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {missingDependencies.length > 0 ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">Imported packages missing from package.json</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missingDependencies.map((missingDep) => (
              <Badge key={missingDep} variant="warning">
                {missingDep}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
