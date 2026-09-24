"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ImportPreviewState, ImportCommitState } from "./form-state";

interface ImportClientProps {
  validateAction: (formData: FormData) => Promise<ImportPreviewState>;
  commitAction: (formData: FormData) => Promise<ImportCommitState>;
}

/**
 * FAZ 2C-7 STEP 26 — two explicit steps, never chained automatically:
 * "Önizle" only ever calls validateAction (read-only, see actions.ts's own
 * doc comment), and "İçe Aktar" is a SEPARATE click that calls
 * commitAction with the same file. Nothing here calls commitAction as a
 * side effect of a successful preview — the user must look at the
 * preview and click a second, differently-labeled button, satisfying this
 * turn's "gerçek bir kullanıcı onayı olmadan başlamamalı" requirement.
 *
 * Every value from the uploaded file (row cells, error messages that echo
 * a category/brand/slug back) is rendered as plain JSX text content below
 * — never `dangerouslySetInnerHTML` — so a malicious cell (HTML/script
 * text) can never execute; React's default escaping is the only sanitizer
 * needed here, and the strongest one that won't drift out of sync with
 * the data itself.
 */
export function ImportClient({ validateAction, commitAction }: ImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewState | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setCommitResult(null);
  }

  function handlePreview() {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await validateAction(formData);
      setPreview(result);
      setCommitResult(null);
    });
  }

  function handleCommit() {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await commitAction(formData);
      setCommitResult(result);
    });
  }

  const validRows = (preview?.results ?? []).filter((r) => r.status === "valid");
  const errorRows = (preview?.results ?? []).filter((r) => r.status === "error");
  const insertCount = validRows.filter((r) => r.status === "valid" && r.action === "insert").length;
  const updateCount = validRows.filter((r) => r.status === "valid" && r.action === "update").length;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-black/10 p-4">
        <label htmlFor="import-file" className="mb-1.5 block text-sm font-medium text-foreground">
          CSV veya XLSX Dosyası
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          className="block text-sm text-foreground/70"
        />
        <p className="mt-1.5 text-xs text-foreground/50">
          Kabul edilen biçimler: .csv, .xlsx (maks. 2MB, maks. 500 satır). Makro içeren .xlsm ve eski .xls/.xlsb
          desteklenmiyor.
        </p>

        <div className="mt-3">
          <Button type="button" size="sm" variant="outline" disabled={!file || isPending} onClick={handlePreview}>
            {isPending ? "İşleniyor..." : "Önizle"}
          </Button>
        </div>
      </div>

      {preview?.status === "error" ? (
        <p role="alert" className="text-sm text-red-600">
          {preview.error}
        </p>
      ) : null}

      {preview?.status === "ready" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 rounded-lg border border-black/10 p-4 text-sm">
            <span className="text-foreground">Toplam satır: {preview.results.length}</span>
            <span className="text-green-700">Geçerli: {validRows.length}</span>
            <span className="text-red-600">Hatalı: {errorRows.length}</span>
            <span className="text-foreground/70">Yeni (INSERT): {insertCount}</span>
            <span className="text-foreground/70">Güncelleme (UPDATE): {updateCount}</span>
          </div>

          {errorRows.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-700">Hatalı Satırlar</h3>
              <ul className="mt-2 space-y-2 text-xs text-red-700">
                {errorRows.map((row) =>
                  row.status === "error" ? (
                    <li key={row.fileRowNumber}>
                      <span className="font-medium">Satır {row.fileRowNumber}:</span> {row.errors.join(" ")}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ) : null}

          {validRows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-black/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5">
                  <tr>
                    <th className="px-3 py-2">Satır</th>
                    <th className="px-3 py-2">İşlem</th>
                    <th className="px-3 py-2">Ürün Adı</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Fiyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {validRows.map((row) =>
                    row.status === "valid" ? (
                      <tr key={row.fileRowNumber}>
                        <td className="px-3 py-2">{row.fileRowNumber}</td>
                        <td className="px-3 py-2">{row.action === "insert" ? "Yeni" : "Güncelle"}</td>
                        <td className="px-3 py-2">{row.data.name}</td>
                        <td className="px-3 py-2">{row.data.sku}</td>
                        <td className="px-3 py-2">{row.data.price.toLocaleString("tr-TR")}</td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          <Button type="button" size="sm" disabled={validRows.length === 0 || isPending} onClick={handleCommit}>
            {isPending ? "İçe aktarılıyor..." : `İçe Aktar (${validRows.length} satır)`}
          </Button>
        </div>
      ) : null}

      {commitResult?.status === "error" ? (
        <p role="alert" className="text-sm text-red-600">
          {commitResult.error}
        </p>
      ) : null}

      {commitResult?.status === "done" && commitResult.summary ? (
        <div className="rounded-lg border border-black/10 p-4 text-sm">
          <h3 className="font-semibold text-foreground">İçe Aktarma Tamamlandı</h3>
          <ul className="mt-2 space-y-1 text-foreground/70">
            <li>Eklenen: {commitResult.summary.added}</li>
            <li>Güncellenen: {commitResult.summary.updated}</li>
            <li>Başarısız: {commitResult.summary.failed}</li>
            <li>Toplam: {commitResult.summary.total}</li>
          </ul>
          {commitResult.rowErrors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-red-600">
              {commitResult.rowErrors.map((row) => (
                <li key={row.fileRowNumber}>
                  Satır {row.fileRowNumber}: {row.errors.join(" ")}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
