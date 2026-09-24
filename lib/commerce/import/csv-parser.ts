import "server-only";

/**
 * FAZ 2C-7 STEP 26, extended FAZ 2C STEP 27 — dependency-free CSV parser
 * (RFC4180-ish: quoted fields, "" escaping, embedded commas/newlines
 * inside quotes). Still no dependency for CSV itself — a small hand-
 * written state machine is plenty for this one simple text format. XLSX
 * (a binary ZIP+XML format, a materially different problem) is handled
 * separately by xlsx-parser.ts, which both return the SAME `ParsedCsv`
 * shape so the rest of the import pipeline (product-import-columns.ts's
 * mapHeadersToRows, validate-import-rows.ts) never needs to know which
 * format an upload came from. Size/row-count limits and format detection
 * now live in file-safety.ts (format-agnostic, used by both parsers'
 * callers).
 */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  // Strip a UTF-8 BOM if present (Excel writes one; our own template download adds one too).
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // Ignored — the following \n (or end of string) closes the row.
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Final field/row — the file may or may not end with a trailing newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  const [headerRow, ...dataRows] = nonEmptyRows;

  return {
    headers: (headerRow ?? []).map((h) => h.trim()),
    rows: dataRows,
  };
}
