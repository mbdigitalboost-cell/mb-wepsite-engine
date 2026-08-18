"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { uploadCustomerImage, type UploadCustomerImageResult } from "@/lib/media/upload-customer-image";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/media/constants";

/**
 * Faz 14 (görsel doğrudan yükleme): lets a field on the Hero form or a
 * Çözümler/Hizmetler/Projeler/Kampanyalar/Referanslar form upload a file
 * directly — no more "go to Medya, upload, copy the URL, come back and
 * paste it" round trip. Called straight from the client
 * (components/dashboard/image-upload-field.tsx), not through a <form
 * action=...> submit, so it can run the moment a file is picked and
 * report the resulting URL back into that field.
 *
 * `folder` comes from the calling form (e.g. "hero", "solutions") — kept
 * as a plain string param (not a bound value) so ImageUploadField stays
 * generic; validated against MEDIA_FOLDERS here since it crosses the
 * client/server boundary and could in principle be tampered with.
 * Falls back to "brand" for anything unrecognized rather than failing
 * the whole upload over a folder name.
 */
export async function uploadInlineImageAction(
  customerId: string,
  folder: string,
  formData: FormData,
): Promise<UploadCustomerImageResult> {
  const { user } = await requireCustomerAccess(customerId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }

  const safeFolder: MediaFolder = (MEDIA_FOLDERS as readonly string[]).includes(folder)
    ? (folder as MediaFolder)
    : "brand";

  const result = await uploadCustomerImage({ customerId, userId: user.id, file, folder: safeFolder });

  if (result.url) {
    // Uploading here also creates a media_assets row (same as the Medya
    // Kütüphanesi form) — keep that list's page fresh too, not just
    // whichever content page triggered this upload.
    revalidatePath(`/dashboard/customers/${customerId}/media`);
  }

  return result;
}
