"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { uploadMediaAssetAction } from "./actions";
import { initialMediaFormState } from "./form-state";
import { MEDIA_FOLDERS, ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_FILE_SIZE_BYTES } from "@/lib/media/constants";
import { inputClasses } from "@/lib/utils/input-classes";

/**
 * Phase 9.4: real file upload, replacing Phase 6's URL-typing form.
 * `<input type="file">` + a folder dropdown (MEDIA_FOLDERS, shared with
 * the server action and the Storage bucket's own allow-list) + optional
 * alt text — everything else (file_name, file_url, storage_path, type)
 * is derived server-side from the uploaded file itself, never typed by
 * hand, so it can never drift from what was actually uploaded.
 */
export function MediaForm({ customerId }: { customerId: string }) {
  const action = uploadMediaAssetAction.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, initialMediaFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor={`${formId}-file`} className="mb-1.5 block text-sm font-medium text-foreground">
          Dosya
        </label>
        <input
          id={`${formId}-file`}
          name="file"
          type="file"
          required
          accept={ALLOWED_MEDIA_MIME_TYPES.join(",")}
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          JPEG, PNG, WebP, SVG veya GIF — en fazla {MAX_MEDIA_FILE_SIZE_BYTES / 1024 / 1024} MB.
        </p>
      </div>
      <div>
        <label htmlFor={`${formId}-folder`} className="mb-1.5 block text-sm font-medium text-foreground">
          Klasör
        </label>
        <select id={`${formId}-folder`} name="folder" required defaultValue="" className={inputClasses}>
          <option value="" disabled>
            Klasör seçin
          </option>
          {MEDIA_FOLDERS.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${formId}-altText`} className="mb-1.5 block text-sm font-medium text-foreground">
          Alt Metin
        </label>
        <input id={`${formId}-altText`} name="altText" type="text" className={inputClasses} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Yükleniyor..." : "Yükle"}
      </Button>
    </form>
  );
}
