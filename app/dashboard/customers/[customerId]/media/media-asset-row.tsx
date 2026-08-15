"use client";

import { useActionState, useId, useState } from "react";
import { updateMediaAssetAction, deleteMediaAssetAction } from "./actions";
import { initialMediaFormState } from "./form-state";

const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus-visible:border-foreground/40 focus-visible:outline-none";

interface MediaAssetRowProps {
  customerId: string;
  assetId: string;
  fileName: string;
  storagePath: string;
  fileUrl: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  inUse: boolean;
}

/**
 * Phase 9.4: one row = copy-URL button, delete button, and an
 * expandable edit form (file_name/alt_text only — see
 * updateMediaAssetAction's comment for why storage_path/file_url are
 * never editable here).
 */
export function MediaAssetRow({
  customerId,
  assetId,
  fileName,
  storagePath,
  fileUrl,
  altText,
  width,
  height,
  inUse,
}: MediaAssetRowProps) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const formId = useId();

  const updateAction = updateMediaAssetAction.bind(null, customerId, assetId);
  const [state, formAction, pending] = useActionState(updateAction, initialMediaFormState);
  const deleteAction = deleteMediaAssetAction.bind(null, customerId, assetId);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context)
      // — fail silently rather than throwing in the UI; the URL is still
      // visible/selectable in the row itself.
    }
  }

  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-foreground/50">{storagePath}</p>
          {altText ? <p className="text-xs text-foreground/40">alt: {altText}</p> : null}
          {width && height ? (
            <p className="text-xs text-foreground/40">
              {width}×{height}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className={inUse ? "text-xs text-green-700" : "text-xs text-foreground/40"}>
            {inUse ? "Kullanımda" : "Kullanılmıyor"}
          </span>
          <button type="button" onClick={handleCopy} className="text-xs text-foreground/70 underline-offset-2 hover:underline">
            {copied ? "Kopyalandı" : "URL Kopyala"}
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs text-foreground/70 underline-offset-2 hover:underline">
            {editing ? "Vazgeç" : "Düzenle"}
          </button>
          <form action={deleteAction}>
            <button type="submit" className="text-xs text-red-600 underline-offset-2 hover:underline">
              Sil
            </button>
          </form>
        </div>
      </div>

      {editing ? (
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3 border-t border-black/10 pt-3">
          <div>
            <label htmlFor={`${formId}-fileName`} className="mb-1 block text-xs font-medium text-foreground">
              Dosya Adı
            </label>
            <input id={`${formId}-fileName`} name="fileName" type="text" required defaultValue={fileName} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-altText`} className="mb-1 block text-xs font-medium text-foreground">
              Alt Metin
            </label>
            <input id={`${formId}-altText`} name="altText" type="text" defaultValue={altText ?? ""} className={inputClasses} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/5"
          >
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          {state.error ? (
            <p role="alert" className="w-full text-xs text-red-600">
              {state.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}
