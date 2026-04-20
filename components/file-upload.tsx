"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileUp, FolderOpen, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SOURCE_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"];

function hasScannableExtension(filePath: string) {
  return SOURCE_EXTENSIONS.some((extension) => filePath.toLowerCase().endsWith(extension));
}

interface FileUploadProps {
  enabled: boolean;
}

export function FileUpload({ enabled }: FileUploadProps) {
  const router = useRouter();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [sourceZipFile, setSourceZipFile] = useState<File | null>(null);
  const [sourceFolderFiles, setSourceFolderFiles] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const packageDropzone = useDropzone({
    accept: {
      "application/json": [".json"],
    },
    maxFiles: 1,
    multiple: false,
    onDropAccepted: (acceptedFiles) => {
      setPackageFile(acceptedFiles[0] ?? null);
    },
  });

  const sourceZipDropzone = useDropzone({
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    maxFiles: 1,
    multiple: false,
    onDropAccepted: (acceptedFiles) => {
      setSourceZipFile(acceptedFiles[0] ?? null);
      setSourceFolderFiles([]);
    },
  });

  const sourceSelectionLabel = useMemo(() => {
    if (sourceFolderFiles.length > 0) {
      return `${sourceFolderFiles.length} files selected from folder`;
    }

    if (sourceZipFile) {
      return `Zip selected: ${sourceZipFile.name}`;
    }

    return "No source files selected";
  }, [sourceFolderFiles.length, sourceZipFile]);

  const scanUploadedFiles = async () => {
    if (!enabled) {
      setErrorMessage("Purchase access to run scans.");
      return;
    }

    if (!packageFile) {
      setErrorMessage("Upload package.json before scanning.");
      return;
    }

    setErrorMessage(null);
    setIsScanning(true);

    try {
      let response: Response;

      if (sourceFolderFiles.length > 0) {
        const packageJsonText = await packageFile.text();
        const files: Record<string, string> = {};

        for (const file of sourceFolderFiles) {
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
          if (!hasScannableExtension(relativePath)) {
            continue;
          }

          files[relativePath] = await file.text();
        }

        response = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packageJsonText,
            files,
            projectName: packageFile.name.replace(/\.json$/i, ""),
          }),
        });
      } else {
        if (!sourceZipFile) {
          throw new Error("Upload a source zip or choose your src folder.");
        }

        const formData = new FormData();
        formData.append("packageJson", packageFile);
        formData.append("sourceZip", sourceZipFile);

        response = await fetch("/api/scan", {
          method: "POST",
          body: formData,
        });
      }

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Scan failed.");
      }

      router.push(`/results/${payload.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not complete scan.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle>Upload package.json + source files</CardTitle>
        <CardDescription>
          Upload `package.json` and either a zipped source folder or a direct folder selection. We parse each import and
          cross-check your dependency lists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...packageDropzone.getRootProps()}
          className="cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300"
        >
          <input {...packageDropzone.getInputProps()} />
          <div className="flex items-center gap-2">
            <FileUp className="size-4 text-emerald-300" />
            <span>{packageFile ? `package.json: ${packageFile.name}` : "Drop package.json here or click to browse"}</span>
          </div>
        </div>

        <div
          {...sourceZipDropzone.getRootProps()}
          className="cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300"
        >
          <input {...sourceZipDropzone.getInputProps()} />
          <div className="flex items-center gap-2">
            <FileUp className="size-4 text-emerald-300" />
            <span>{sourceZipFile ? `Source zip: ${sourceZipFile.name}` : "Drop a .zip of src/ here (optional if folder selected)"}</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <label className="mb-2 block text-sm text-slate-300" htmlFor="source-folder-input">
            Or choose a source folder directly
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="source-folder-input"
              ref={folderInputRef}
              className="block text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-slate-600"
              type="file"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setSourceFolderFiles(files);
                setSourceZipFile(null);
              }}
            />
            <div className="inline-flex items-center gap-2 text-xs text-slate-400">
              <FolderOpen className="size-4" />
              <span>{sourceSelectionLabel}</span>
            </div>
          </div>
        </div>

        {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

        <Button onClick={scanUploadedFiles} disabled={isScanning || !enabled}>
          {isScanning ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
          {isScanning ? "Running AST scan..." : "Scan Uploaded Project"}
        </Button>
      </CardContent>
    </Card>
  );
}
