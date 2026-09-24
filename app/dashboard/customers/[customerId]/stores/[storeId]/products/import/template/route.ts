import { NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { IMPORT_COLUMNS } from "@/lib/commerce/import/product-import-columns";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsvLine(cells: string[]): string {
  return cells.map(csvEscape).join(",");
}

/**
 * FAZ 2C-7 STEP 26 — demo-only template download, `requireStoreAccess`
 * gated for defense-in-depth even though the content is non-sensitive
 * fixed text (the dashboard route tree is already session-gated upstream
 * — this is a second, explicit check, not a replacement for it).
 *
 * The one sample row is unmistakably marked DEMO / IMPORT EDİLMEZ in its
 * own Ürün Adı, Slug and SKU cells, and set "Aktif" = Hayır — no
 * fabricated Taktikalp46 product data (this turn's own "gerçek ürün
 * üretme" rule). Importing this exact row would also fail validation
 * outright unless CANİK/SİLAH KILIFLARI happen to already exist in the
 * target store (migrations 0025/0026, still drafts as of this step) —
 * it is not wired to silently succeed.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string; storeId: string }> }) {
  const { storeId } = await params;
  await requireStoreAccess(storeId);

  const demoRow = [
    "DEMO ÜRÜN - IMPORT EDİLMEZ",
    "demo-urun-import-edilmez",
    "SİLAH KILIFLARI",
    "",
    "CANİK",
    "TP9 SFx",
    "Örnek kısa açıklama",
    "Örnek uzun açıklama",
    "1500.00",
    "1800.00",
    "10",
    "DEMO-SKU-0001",
    "",
    "",
    "",
    "Hayır",
  ];

  const csv = [toCsvLine([...IMPORT_COLUMNS]), toCsvLine(demoRow)].join("\r\n") + "\r\n";
  const bom = "﻿"; // Excel-friendly UTF-8 BOM so Turkish characters render correctly when opened directly.

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taktikalp46-urun-import-sablonu.csv"',
    },
  });
}
