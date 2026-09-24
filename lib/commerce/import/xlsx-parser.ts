import "server-only";

import * as XLSX from "xlsx";
import type { ParsedCsv } from "./csv-parser";

export type ParseXlsxResult = { ok: true; data: ParsedCsv } | { ok: false; error: string };

/** Real cell-address keys (e.g. "I2") vs. SheetJS's own metadata keys ("!ref", "!merges", "!cols", ...). */
const CELL_ADDRESS_KEY_PATTERN = /^[A-Z]+[0-9]+$/;

/**
 * FAZ 2C STEP 27, hardened in FAZ 2C STEP 28 — XLSX reader built on
 * SheetJS (`xlsx`, installed from SheetJS's own CDN at 0.20.3 — the
 * npm-registry release tops out at a vulnerable 0.18.5 with two unpatched
 * high-severity advisories; see the STEP 27 report). Success shape is the
 * SAME `ParsedCsv` (`{ headers, rows }`) csv-parser.ts's `parseCsv`
 * produces — the entire downstream pipeline (product-import-columns.ts's
 * mapHeadersToRows, validate-import-rows.ts) never knows or cares which
 * format an upload came from. Unlike `parseCsv` (which can't fail — a
 * malformed CSV just yields fewer/emptier rows), this function returns a
 * `{ ok: false, error }` result for anything genuinely unreadable or
 * containing a real formula — its caller (actions.ts's `parseAndCheckFile`)
 * surfaces that as the same kind of user-facing error CSV's own header/
 * row-count checks already produce, not an uncaught exception.
 *
 * STEP 28 — REAL FORMULA CELLS ARE REJECTED, NOT SILENTLY IMPORTED:
 * STEP 27 read with `cellFormula: false`, so `cell.f` (the formula
 * source) was never even parsed into memory — only a cell's last-CACHED
 * value (`cell.v`) was read. That meant a genuine `=SUM(A1:A2)` cell's
 * computed number flowed through as if it were ordinary typed data,
 * indistinguishable from a person having typed "1500" directly. This
 * turn reads with `cellFormula: true` instead specifically so `cell.f`
 * IS populated when a cell holds a real formula, then scans every cell
 * BEFORE any value extraction: if `cell.f` is a string anywhere in the
 * sheet, the whole file is rejected with the offending cell address(es)
 * (Excel's own "I2"-style notation — directly readable by the user in
 * their own file, whether or not "I" happens to be one of our 16 tracked
 * columns). The formula's own TEXT is deliberately never placed in the
 * error message, logged, or returned anywhere from this module — only
 * its address is (this turn's own "formülün kendisini göstermeye gerek
 * yok" requirement). Letting `cellFormula: true` parse formula text
 * briefly into memory is the necessary trade-off for detecting it at
 * all; the text itself never leaves this function's local scope.
 *
 * Deliberate parsing choices, matching this turn's own safety spec:
 *
 *  - Only the FIRST worksheet is read (`workbook.SheetNames[0]`).
 *  - `cellDates: false` (stated explicitly) — a cell SheetJS might
 *    otherwise auto-format as a date instead comes back as its raw
 *    numeric serial. None of our 16 columns are dates; this avoids
 *    "beklenmeyen otomatik format üretmemeli" by simply never invoking
 *    SheetJS's date-formatting path at all.
 *  - `raw: true` in `sheet_to_json` — numeric cells come back as plain
 *    JS numbers (never locale-formatted strings with thousands
 *    separators or currency symbols), rendered below via a plain
 *    `String(value)` — exactly the bare `-?\d+(\.\d+)?` shape
 *    validate-import-rows.ts's parseNumberField already requires. Text
 *    cells come back as their literal string content, unformatted.
 *  - Formula-injection (a plain TEXT cell that merely starts with
 *    =/+/-/@, not a real formula): once real-formula cells are rejected
 *    above, every remaining cell's `.v` is ordinary typed data, and a
 *    text value starting with =/+/-/@ flows into the exact same
 *    `hasFormulaInjectionRisk` check validate-import-rows.ts already
 *    runs on every CSV cell — unchanged, no XLSX-specific duplicate
 *    logic (this turn's own requirement #3/#4).
 *  - No macro/VBA execution is possible: SheetJS only parses the OOXML
 *    data model (sheet/cell/style XML parts) — it never evaluates a
 *    formula as executable code and never runs a workbook's
 *    `vbaProject.bin` binary. `.xlsm` is rejected by file extension
 *    before this function is ever called (file-safety.ts's
 *    `assertImportFileIsSafe`) — this module never sees a macro-enabled
 *    file at all.
 *  - No external-reference/external-data resolution: SheetJS's `read()`
 *    is a pure in-memory parser with no network/file-system I/O
 *    capability at all — there is nothing to disable, it simply cannot
 *    reach outside the bytes it was given.
 *  - No HTML is generated anywhere in this path (`sheet_to_html` is
 *    never called).
 *  - Malformed input (a corrupt/non-XLSX byte stream, a workbook with no
 *    readable sheet) is caught and returned as a controlled `{ ok: false }`
 *    result, never an uncaught exception reaching the Server Action.
 *
 * Residual, ACCEPTED risk (documented, not engineered around this turn):
 * a specially-crafted small `.xlsx` could in principle decompress to a
 * very large in-memory sheet (a "zip bomb"-style ratio) before this
 * module's caller ever checks MAX_IMPORT_ROWS — the 2MB compressed-size
 * cap (file-safety.ts) bounds this substantially but doesn't eliminate
 * it. Accepted given the upload endpoint is `requireStoreEditorAccess`-
 * gated (an authenticated store admin/editor, not a public/anonymous
 * upload surface) — see the STEP 27 report.
 */
export function parseXlsx(buffer: ArrayBuffer): ParseXlsxResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: false, cellFormula: true });
  } catch {
    return { ok: false, error: "XLSX dosyası okunamadı — dosya bozuk veya geçerli bir Excel dosyası değil." };
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { ok: false, error: "XLSX dosyasında hiç sayfa (worksheet) bulunamadı." };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return { ok: false, error: "XLSX dosyasının ilk sayfası okunamadı." };
  }

  const formulaAddresses: string[] = [];
  for (const key of Object.keys(sheet)) {
    if (!CELL_ADDRESS_KEY_PATTERN.test(key)) continue; // skip "!ref", "!merges", "!cols", ... metadata keys
    const cell = sheet[key] as XLSX.CellObject | undefined;
    if (cell && typeof cell.f === "string") {
      formulaAddresses.push(key);
    }
  }

  if (formulaAddresses.length > 0) {
    const sorted = [...formulaAddresses].sort();
    const preview = sorted.slice(0, 10).join(", ");
    const suffix = sorted.length > 10 ? ` (+${sorted.length - 10} tane daha)` : "";
    return {
      ok: false,
      error:
        `Dosyada gerçek Excel formülü içeren hücre(ler) bulundu: ${preview}${suffix}. ` +
        `Formül içeren hücreler içe aktarılamaz — bu hücreleri sabit değerle değiştirip ` +
        `(Excel'de: Kopyala > Yapıştır Seçenekleri > Sadece Değerler) yeniden yükleyin.`,
    };
  }

  let rawRows: unknown[][];
  try {
    rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false,
    });
  } catch {
    return { ok: false, error: "XLSX dosyasının içeriği okunamadı." };
  }

  const stringRows: string[][] = rawRows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return "";
      if (typeof cell === "number") return String(cell);
      if (typeof cell === "boolean") return cell ? "TRUE" : "FALSE";
      return String(cell).trim();
    }),
  );

  // Same "drop fully-blank rows" pass csv-parser.ts's parseCsv already
  // does — `blankrows: false` above already handles most of this at the
  // SheetJS level, but a row of only-whitespace cells (not truly blank)
  // can still slip through; this keeps both parsers' output identically
  // clean rather than relying on the library's own definition of "blank".
  const nonEmptyRows = stringRows.filter((row) => row.some((cell) => cell.trim() !== ""));
  const [headerRow, ...dataRows] = nonEmptyRows;

  return {
    ok: true,
    data: {
      headers: (headerRow ?? []).map((h) => h.trim()),
      rows: dataRows,
    },
  };
}
