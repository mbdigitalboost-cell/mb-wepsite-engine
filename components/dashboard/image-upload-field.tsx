"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import { inputClasses } from "@/lib/utils/input-classes";
import { uploadInlineImageAction } from "@/lib/media/inline-image-upload-action";
import { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_FILE_SIZE_BYTES } from "@/lib/media/constants";

interface ImageUploadFieldProps {
  customerId: string;
  /** Which Storage folder this upload lands in — see lib/media/constants.ts's MEDIA_FOLDERS. */
  folder: string;
  /** Form field name the resulting URL is submitted under — unchanged from the old plain-URL input, so no server action/schema needed updating. */
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}

/**
 * Faz 14 (görsel doğrudan yükleme): replaces "paste a URL you copied
 * from Medya Kütüphanesi" with "pick a file, it uploads immediately".
 * Still submits a plain URL string under `name` — same hidden-input
 * contract every existing form/action/Zod schema already expects — so
 * this is a drop-in visual upgrade, not a data-shape change.
 *
 * Uses next/image's `unoptimized` prop for the preview: Petra's
 * (customer-specific) Supabase Storage domain isn't and shouldn't be
 * hardcoded into next.config.ts's remotePatterns — a future customer's
 * project lives at a different domain, and this same component/form
 * config serves every customer. `unoptimized` skips the domain
 * allow-list entirely for this one preview thumbnail (a small,
 * already-compressed marketing image, not a page-weight concern).
 */
export function ImageUploadField({ customerId, folder, name, label, defaultValue = "", required }: ImageUploadFieldProps) {
  const id = useId();
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadInlineImageAction(customerId, folder, formData);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        setUrl(result.url);
      }
    });
  }

  return (
    <div>
      <label htmlFor={`${id}-file`} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>

      {url ? (
        <div className="mb-2 flex items-center gap-3">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-black/10 bg-black/5">
            <Image src={url} alt="" fill unoptimized sizes="96px" className="object-cover" />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-foreground/50">{url}</p>
        </div>
      ) : null}

      <input
        id={`${id}-file`}
        type="file"
        accept={ALLOWED_MEDIA_MIME_TYPES.join(",")}
        onChange={handleFileChange}
        disabled={isPending}
        className={inputClasses}
      />
      <p className="mt-1 text-xs text-foreground/50">
        {isPending
          ? "Yükleniyor..."
          : `Bir görsel seçtiğinde otomatik yüklenir (JPEG, PNG, WebP, SVG veya GIF — en fazla ${MAX_MEDIA_FILE_SIZE_BYTES / 1024 / 1024} MB).`}
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {/* The actual form field — the file input above never submits directly, only the URL it resolves to. */}
      <input type="hidden" name={name} value={url} required={required} />
    </div>
  );
}
