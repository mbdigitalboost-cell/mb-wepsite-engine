import type { ImportRowResult } from "@/lib/commerce/import/validate-import-rows";

export interface ImportPreviewState {
  status: "idle" | "error" | "ready";
  error: string | null;
  results: ImportRowResult[];
}

export const initialImportPreviewState: ImportPreviewState = { status: "idle", error: null, results: [] };

export interface ImportCommitState {
  status: "idle" | "error" | "done";
  error: string | null;
  summary: { added: number; updated: number; failed: number; total: number } | null;
  rowErrors: Array<{ fileRowNumber: number; errors: string[] }>;
}

export const initialImportCommitState: ImportCommitState = {
  status: "idle",
  error: null,
  summary: null,
  rowErrors: [],
};
