"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { parseCsv } from "@/lib/commerce/import/csv-parser";
import { parseXlsx } from "@/lib/commerce/import/xlsx-parser";
import { assertImportFileIsSafe, detectImportFileFormat, MAX_IMPORT_ROWS } from "@/lib/commerce/import/file-safety";
import { mapHeadersToRows, REQUIRED_HEADER_COLUMNS } from "@/lib/commerce/import/product-import-columns";
import { validateImportRows } from "@/lib/commerce/import/validate-import-rows";
import { toFriendlyError } from "@/lib/commerce/product-errors";
import type { ImportPreviewState, ImportCommitState } from "./form-state";

/**
 * Shared by both actions below — file shape checks + format-branch parse +
 * header check, extracted so preview and commit can never drift out of
 * sync with each other. FAZ 2C STEP 27: the only thing that changed here
 * for XLSX support is WHICH parser produces `{ headers, rows }` — the
 * format check (REQUIRED_HEADER_COLUMNS, row-count cap) and everything
 * downstream (mapHeadersToRows, validateImportRows, commit) stayed
 * exactly as STEP 26 built them, unaware of file format entirely.
 *
 * FAZ 2C STEP 28: `parseCsv` is untouched (it can't fail — a malformed
 * CSV just yields fewer/emptier rows, same as always). `parseXlsx` can
 * now genuinely fail (a real formula cell, or an unreadable/malformed
 * workbook) — its `{ ok: false, error }` result is surfaced here exactly
 * like every other `parseAndCheckFile` rejection, never thrown.
 */
async function parseAndCheckFile(
  formData: FormData,
): Promise<{ ok: true; rawRows: ReturnType<typeof mapHeadersToRows>; fileName: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bir CSV veya XLSX dosyası seçin." };
  }

  const fileError = assertImportFileIsSafe(file);
  if (fileError) return { ok: false, error: fileError };

  // detectImportFileFormat can't return null here — assertImportFileIsSafe
  // above already rejected anything it wouldn't recognize.
  const format = detectImportFileFormat(file.name);

  let headers: string[];
  let rows: string[][];
  if (format === "xlsx") {
    const parsed = parseXlsx(await file.arrayBuffer());
    if (!parsed.ok) return { ok: false, error: parsed.error };
    ({ headers, rows } = parsed.data);
  } else {
    ({ headers, rows } = parseCsv(await file.text()));
  }

  const missingColumns = REQUIRED_HEADER_COLUMNS.filter((required) => !headers.includes(required));
  if (missingColumns.length > 0) {
    return { ok: false, error: `Eksik zorunlu kolon(lar): ${missingColumns.join(", ")}.` };
  }

  if (rows.length === 0) {
    return { ok: false, error: "Dosyada veri satırı bulunamadı." };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Dosya çok fazla satır içeriyor (${rows.length}). Maks. ${MAX_IMPORT_ROWS}.` };
  }

  return { ok: true, rawRows: mapHeadersToRows(headers, rows), fileName: file.name };
}

/**
 * FAZ 2C-7 STEP 26 — preview/validate half of the two-step flow. Contains
 * NO insert/update/delete call anywhere in this function or anything it
 * calls (parseAndCheckFile only reads the uploaded File in memory,
 * validateImportRows only SELECTs) — "Preview aşamasında DB WRITE YOK" is
 * true by construction here, not by a flag that could be forgotten.
 */
export async function validateImportAction(
  customerId: string,
  storeId: string,
  formData: FormData,
): Promise<ImportPreviewState> {
  await requireStoreEditorAccess(storeId);

  const parsedFile = await parseAndCheckFile(formData);
  if (!parsedFile.ok) return { status: "error", error: parsedFile.error, results: [] };

  const validation = await validateImportRows(storeId, parsedFile.rawRows);
  if (!validation.ok) return { status: "error", error: validation.error, results: [] };

  return { status: "ready", error: null, results: validation.results };
}

/**
 * The ONLY function in this file that writes. Re-parses and re-validates
 * the file from scratch — never trusts a client-echoed preview result,
 * since that would mean trusting values a browser session could have
 * tampered with before submitting. This is the real "commit", reached
 * only via the user's separate, explicit "İçe Aktar" click (import-client.tsx
 * never calls this automatically after a preview).
 *
 * INSERT/UPDATE only — no DELETE call exists anywhere in this file, so a
 * product simply absent from the sheet is never touched, let alone
 * removed (STEP 26's own "upsert güvenliği" / no-delete-guarantee
 * requirement). Rows are written one at a time, independently — see the
 * STEP 26 report's "Transaction/RPC" section for why a single-transaction
 * RPC wasn't built for this first version.
 */
export async function commitImportAction(
  customerId: string,
  storeId: string,
  formData: FormData,
): Promise<ImportCommitState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsedFile = await parseAndCheckFile(formData);
  if (!parsedFile.ok) return { status: "error", error: parsedFile.error, summary: null, rowErrors: [] };

  const validation = await validateImportRows(storeId, parsedFile.rawRows);
  if (!validation.ok) return { status: "error", error: validation.error, summary: null, rowErrors: [] };

  const supabase = await createSupabaseServerClient();

  let added = 0;
  let updated = 0;
  let failed = 0;
  const rowErrors: Array<{ fileRowNumber: number; errors: string[] }> = [];

  for (const result of validation.results) {
    if (result.status === "error") {
      failed++;
      rowErrors.push({ fileRowNumber: result.fileRowNumber, errors: result.errors });
      continue;
    }

    const payload = {
      store_id: storeId,
      category_id: result.data.categoryId,
      brand_id: result.data.brandId,
      name: result.data.name,
      slug: result.data.slug,
      sku: result.data.sku,
      barcode: result.data.barcode,
      model: result.data.model,
      short_description: result.data.shortDescription,
      description: result.data.description,
      price: result.data.price,
      compare_at_price: result.data.compareAtPrice,
      stock: result.data.stock,
      is_active: result.data.isActive,
      seo_title: result.data.seoTitle,
      seo_description: result.data.seoDescription,
    };

    if (result.action === "update" && result.existingProductId) {
      // Row-id filter is NEVER trusted alone — store_id is always ANDed
      // in, same discipline as every other update in this codebase.
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", result.existingProductId)
        .eq("store_id", storeId);
      if (error) {
        failed++;
        // toFriendlyError already prefixes non-23505 errors with
        // "Kaydedilemedi:" (same helper products/actions.ts's own
        // createProductAction/updateProductAction use, unprefixed) — no
        // separate "Güncellenemedi:"/"Eklenemedi:" wrapper added here to
        // avoid a doubled-up prefix; the preview grid's own "İşlem" column
        // already shows insert vs. update for this row.
        rowErrors.push({ fileRowNumber: result.fileRowNumber, errors: [toFriendlyError(error)] });
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) {
        failed++;
        rowErrors.push({ fileRowNumber: result.fileRowNumber, errors: [toFriendlyError(error)] });
      } else {
        added++;
      }
    }
  }

  const total = validation.results.length;

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.import",
    entityType: "product",
    metadata: { fileName: parsedFile.fileName, added, updated, failed, total },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidateTag(storeProductsTag(storeId), "max");

  return { status: "done", error: null, summary: { added, updated, failed, total }, rowErrors };
}
