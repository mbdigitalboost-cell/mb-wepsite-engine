import "server-only";

/**
 * FAZ 2C STEP 27 — format-agnostic import-file limits, pulled out of
 * csv-parser.ts now that a second format (XLSX) exists. Both
 * validateImportAction and commitImportAction call `assertImportFileIsSafe`
 * on the SAME uploaded file object independently (preview never trusts a
 * check the commit step didn't repeat, and vice versa).
 */
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024; // 2 MB — generous for ~40-500 rows, small enough to block accidental huge uploads.
export const MAX_IMPORT_ROWS = 500;

export type ImportFileFormat = "csv" | "xlsx";

/**
 * Extension-based, not MIME-type-based — a browser's reported `File.type`
 * for CSV/XLSX is inconsistent across OS/browser combinations and is
 * trivially spoofable client-side, so it's never used as the security
 * boundary here (this turn's own instruction: "MIME type kontrolü tek
 * başına güvenlik kaynağı olarak kullanılmamalı"). `.xlsm` (macro-enabled)
 * and the legacy binary `.xls`/`.xlsb` formats are explicitly rejected,
 * not silently routed into the XLSX parser — xlsx-parser.ts is only ever
 * reached for a file whose extension is exactly `.xlsx`.
 */
export function detectImportFileFormat(fileName: string): ImportFileFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx")) return "xlsx";
  return null;
}

/** Shared by both the preview and commit Server Actions — same checks run twice, never trusted once and skipped the second time. */
export function assertImportFileIsSafe(file: { size: number; name: string }): string | null {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return `Dosya çok büyük (maks. ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)}MB).`;
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsm")) {
    return "Makro içeren XLSM dosyaları desteklenmiyor. Lütfen .xlsx veya .csv olarak kaydedip yeniden yükleyin.";
  }
  if (lower.endsWith(".xls") || lower.endsWith(".xlsb")) {
    return "Eski Excel biçimleri (.xls/.xlsb) desteklenmiyor. Lütfen .xlsx veya .csv olarak kaydedip yeniden yükleyin.";
  }
  if (!detectImportFileFormat(file.name)) {
    return "Yalnızca .csv veya .xlsx dosyaları kabul ediliyor.";
  }
  return null;
}
