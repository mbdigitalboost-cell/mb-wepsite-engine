"use client";

import { useActionState, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { initialProductImageFormState, type ProductImageFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";
import {
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
  isAllowedProductImageMimeType,
} from "@/lib/commerce/product-image-constants";

interface ProductImageEditValues {
  storagePath: string;
  altText: string;
  sortOrder: number;
}

const EMPTY_EDIT_VALUES: ProductImageEditValues = {
  storagePath: "",
  altText: "",
  sortOrder: 0,
};

interface ProductImageFormProps {
  /** "create" renders a real file picker; "edit" renders the existing storage_path read-only (not resubmittable as text) — see actions.ts's createProductImageAction/updateProductImageAction split. */
  mode: "create" | "edit";
  /** Required in "edit" mode (storagePath is round-tripped via a hidden field); ignored in "create" mode. */
  initialValues?: ProductImageEditValues;
  /** Only meaningful on the create form — see actions.ts's updateProductImageAction doc comment for why edit never touches this flag. */
  showIsPrimary?: boolean;
  action: (prevState: ProductImageFormState, formData: FormData) => Promise<ProductImageFormState>;
  submitLabel: string;
}

/**
 * FAZ 2C-1C — Product Images, shared create+update form. `mode="create"`
 * replaced the old free-text "Depolama Yolu" input with a real file
 * picker (`lib/commerce/upload-product-image.ts` does the actual upload,
 * called from createProductImageAction) — client-side MIME/size checks
 * here are UX only, the server independently re-validates both (see that
 * helper). `mode="edit"` never lets the user retype/replace the path —
 * once uploaded, replacing the file isn't supported this phase (delete +
 * re-add instead); the path is carried through as a hidden field purely
 * so productImageFormSchema still validates, and is never actually
 * changed by updateProductImageAction's `.update()` call target fields.
 *
 * On a successful CREATE submission the form resets itself (clears the
 * file input) — file inputs are uncontrolled and won't clear just
 * because the list re-rendered with the new row. Edit forms deliberately
 * do NOT auto-reset (same convention as every other edit form in this
 * codebase — the row's fresh values arrive via revalidatePath, not a
 * client-side reset).
 */
export function ProductImageForm({
  mode,
  initialValues = EMPTY_EDIT_VALUES,
  showIsPrimary = false,
  action,
  submitLabel,
}: ProductImageFormProps) {
  const [state, formAction, pending] = useActionState(action, initialProductImageFormState);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "create" && wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
      setFileError(null);
    }
    wasPending.current = pending;
  }, [mode, pending, state.error]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileError(null);
      return;
    }
    if (file.size === 0) {
      setFileError("Seçilen dosya boş.");
    } else if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      setFileError(
        `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB) — en fazla ${MAX_PRODUCT_IMAGE_SIZE_BYTES / 1024 / 1024} MB olabilir.`,
      );
    } else if (!isAllowedProductImageMimeType(file.type)) {
      setFileError(`Desteklenmeyen dosya türü: ${file.type || "bilinmiyor"}. Yalnızca JPEG, PNG, WebP veya GIF.`);
    } else {
      setFileError(null);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="max-w-md space-y-4">
      {mode === "create" ? (
        <div>
          <label htmlFor={`${formId}-file`} className="mb-1.5 block text-sm font-medium text-foreground">
            Görsel Dosyası
          </label>
          <input
            id={`${formId}-file`}
            name="file"
            type="file"
            required
            accept={PRODUCT_IMAGE_MIME_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={pending}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-foreground/50">
            JPEG, PNG, WebP veya GIF — en fazla {MAX_PRODUCT_IMAGE_SIZE_BYTES / 1024 / 1024} MB.
          </p>
          {fileError ? (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {fileError}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <input type="hidden" name="storagePath" value={initialValues.storagePath} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Depolama Yolu</label>
            <p className="truncate rounded-md border border-black/10 bg-black/[.02] px-4 py-2.5 text-xs text-foreground/60">
              {initialValues.storagePath}
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Dosyayı değiştirmek için bu görseli silip yeniden yükleyin.
            </p>
          </div>
        </>
      )}

      <div>
        <label htmlFor={`${formId}-altText`} className="mb-1.5 block text-sm font-medium text-foreground">
          Alt Metin <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-altText`}
          name="altText"
          type="text"
          defaultValue={initialValues.altText}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-sortOrder`} className="mb-1.5 block text-sm font-medium text-foreground">
          Sıralama
        </label>
        <input
          id={`${formId}-sortOrder`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues.sortOrder}
          className={inputClasses}
        />
      </div>

      {showIsPrimary ? (
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-black/20" />
          Birincil görsel yap
        </label>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending || Boolean(fileError)}>
        {pending ? (mode === "create" ? "Yükleniyor..." : "Kaydediliyor...") : submitLabel}
      </Button>
    </form>
  );
}
