import "server-only";

import * as XLSX from "xlsx";
import { IMPORT_COLUMNS } from "./product-import-columns";

const WORKSHEET_NAME = "Ürünler";

/**
 * FAZ 2C STEP 29 — the one demo row, deliberately unmistakable as a
 * placeholder (name/slug/SKU all say so, "Aktif" is Hayır so it would
 * never surface publicly even if someone imported it as-is). Values
 * mirror the CSV template's own demo row (template/route.ts) exactly —
 * same content, just typed as native numbers where the XLSX format makes
 * that the natural, idiomatic choice (a real Excel user types numbers
 * into price/stock cells, not formatted text like "1500.00"). Kept as a
 * SEPARATE literal from the CSV route's own array on purpose: STEP 29's
 * own instruction is "mevcut CSV template'i bozma" (don't touch the CSV
 * template file at all), so nothing here is extracted from or imported
 * into that file — a small, intentional duplication rather than any risk
 * to the untouched CSV route.
 *
 * All cells are plain values (aoa_to_sheet never produces formulas,
 * hyperlinks or styles on its own) — no `.f`, no `!hyperlinks`, no HTML,
 * nothing macro-related (writing `bookType: "xlsx"` can never produce a
 * macro-enabled workbook; that's structurally what `.xlsm` is for).
 */
const DEMO_ROW: (string | number)[] = [
  "DEMO ÜRÜN - IMPORT EDİLMEZ",
  "demo-urun-import-edilmez",
  "SİLAH KILIFLARI",
  "",
  "CANİK",
  "TP9 SFx",
  "Örnek kısa açıklama",
  "Örnek uzun açıklama",
  1500,
  1800,
  10,
  "DEMO-SKU-0001",
  "",
  "",
  "",
  "Hayır",
];

/**
 * Pure function, no request/session/DB dependency — this is deliberate so
 * STEP 29's own test requirement ("gerçek DB bağlantısı kullanma") can
 * call it directly without going through the authenticated Route Handler.
 * The caller (template/xlsx/route.ts) is the only place that performs the
 * `requireStoreAccess` check; this function never sees `storeId`/
 * `customerId` at all, so there's nothing tenant-specific to accidentally
 * embed in the file content (this turn's own "gereksiz yere yazılmamalı"
 * requirement is satisfied by construction — the values simply aren't in
 * scope here).
 */
export function buildProductImportXlsxTemplateBuffer(): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS], DEMO_ROW]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, WORKSHEET_NAME);

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
