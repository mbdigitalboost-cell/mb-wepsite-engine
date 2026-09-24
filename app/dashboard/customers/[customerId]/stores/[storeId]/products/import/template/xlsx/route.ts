import { NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { buildProductImportXlsxTemplateBuffer } from "@/lib/commerce/import/xlsx-template";

/**
 * FAZ 2C STEP 29 — XLSX counterpart of template/route.ts's CSV download,
 * as its own separate route (that CSV route is untouched — see this
 * turn's own "mevcut CSV template'i bozma" rule). Same
 * `requireStoreAccess` defense-in-depth gate, same non-sensitive-content
 * reasoning as the CSV route's own doc comment. The actual workbook is
 * built by a pure, DB-free function (xlsx-template.ts) — this handler
 * only does the auth check and sets response headers.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string; storeId: string }> }) {
  const { storeId } = await params;
  await requireStoreAccess(storeId);

  const buffer = buildProductImportXlsxTemplateBuffer();

  // NextResponse's BodyInit typing doesn't include Node's Buffer directly
  // (even though Buffer IS a Uint8Array at runtime) — a plain Uint8Array
  // view over the same bytes satisfies it without copying.
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="taktikalp46-urun-import-sablonu.xlsx"',
    },
  });
}
