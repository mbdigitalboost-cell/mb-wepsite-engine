import "server-only";

/**
 * FAZ 2C-7 STEP 26 — the 16 supported import columns, exact Turkish
 * headers per this turn's own spec. Variant/image columns are
 * deliberately NOT here — see the STEP 26 report's "Varyant importunun
 * durumu" / "Görsel importunun durumu" sections for why (architecture
 * only, not implemented this phase).
 */
export const IMPORT_COLUMNS = [
  "Ürün Adı",
  "Slug",
  "Kategori",
  "Alt Kategori",
  "Marka",
  "Model",
  "Kısa Açıklama",
  "Açıklama",
  "Fiyat",
  "Eski Fiyat",
  "Stok",
  "SKU",
  "Barkod",
  "SEO Başlık",
  "SEO Açıklama",
  "Aktif",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const REQUIRED_HEADER_COLUMNS: ImportColumn[] = ["Ürün Adı", "Fiyat", "Stok", "SKU"];

export interface RawImportRow {
  values: Partial<Record<ImportColumn, string>>;
  /** 1-based row number as it appears in the source file (header = row 1) — used in every user-facing error message so a row is easy to find in the original spreadsheet. */
  fileRowNumber: number;
}

/** Maps parsed CSV cells to named fields by header text — a reordered or partially-omitted column set still works, since lookup is by header name, not position. Unrecognized headers are silently ignored (not an error) so an operator's extra notes column doesn't break the import. */
export function mapHeadersToRows(headers: string[], dataRows: string[][]): RawImportRow[] {
  const indexByColumn = new Map<string, number>();
  headers.forEach((header, index) => indexByColumn.set(header.trim(), index));

  return dataRows.map((cells, i) => {
    const values: Partial<Record<ImportColumn, string>> = {};
    for (const column of IMPORT_COLUMNS) {
      const idx = indexByColumn.get(column);
      if (idx !== undefined) values[column] = (cells[idx] ?? "").trim();
    }
    return { values, fileRowNumber: i + 2 }; // +2: header occupies row 1, data starts at row 2
  });
}
