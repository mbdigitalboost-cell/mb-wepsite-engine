import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { getProductImageSignedUrl } from "@/lib/commerce/get-product-image-signed-url";
import { createProductImageAction, updateProductImageAction, setPrimaryImageAction, deleteProductImageAction } from "./actions";
import { ProductImageForm } from "./image-form";

interface ProductImageRow {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

/**
 * FAZ 2C-1C — `product-images` is a PRIVATE bucket, so there is no public
 * URL to render directly; each row gets its own signed URL (1h TTL, see
 * getProductImageSignedUrl). A signing failure NEVER touches the
 * `product_images` row itself (ADIM 8-C) — it only swaps the thumbnail
 * for a small "önizleme yüklenemedi" placeholder, isolated in its own
 * async component so one broken preview can't affect the rest of the
 * list or the row's own edit/delete/set-primary controls.
 */
async function ImagePreview({ storagePath, altText }: { storagePath: string; altText: string }) {
  const result = await getProductImageSignedUrl(storagePath);

  if (!result.url) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-black/10 bg-black/5 text-center text-[10px] text-foreground/40">
        Önizleme yüklenemedi
      </div>
    );
  }

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-black/10 bg-black/5">
      {/* unoptimized — a signed URL is single-use-ish/short-lived and not on next.config.ts's remotePatterns allowlist (which only covers the public object path shape), same reasoning as components/dashboard/image-upload-field.tsx's own preview thumbnail. */}
      <Image src={result.url} alt={altText} fill unoptimized sizes="64px" className="object-cover" />
    </div>
  );
}

/**
 * FAZ 2C-1 — Product Images, flat inline CRUD (brands/categories ile
 * BİREBİR aynı iskelet — bir görsel kaydı, kategori/marka kadar basit bir
 * kaynak, bu yüzden products'ın "list + new/[id]" ağacı yerine bu deseni
 * kullanıyor). Read access `requireStoreAccess` (store_viewer+) — her
 * satırın kendi Düzenle/Sil formu ve "Birincil Yap" butonu kendi
 * requireStoreEditorAccess/requireStoreAdminAccess'ini action içinde
 * BAĞIMSIZ olarak çağırır.
 */
export default async function ProductImagesPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; productId: string }>;
}) {
  const { customerId, storeId, productId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!product) notFound();

  const { data: images } = await supabase
    .from("product_images")
    .select("id, storage_path, alt_text, sort_order, is_primary")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  const rows = (images ?? []) as ProductImageRow[];
  const createAction = createProductImageAction.bind(null, customerId, storeId, productId);
  const basePath = `/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`;

  return (
    <div>
      <Link href={basePath} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {product.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Görseller</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Ürün görselleri. store_editor+ ekleyip düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      <div className="mt-6 rounded-lg border border-black/10 p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-foreground/60">Henüz görsel yok.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {rows.map((image) => {
              const updateAction = updateProductImageAction.bind(null, customerId, storeId, productId, image.id);
              const setPrimary = setPrimaryImageAction.bind(null, customerId, storeId, productId, image.id);
              const deleteAction = deleteProductImageAction.bind(null, customerId, storeId, productId, image.id);

              return (
                <li key={image.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div className="flex flex-1 min-w-[220px] items-start gap-3">
                    <ImagePreview storagePath={image.storage_path} altText={image.alt_text ?? ""} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {image.storage_path}{" "}
                        {image.is_primary ? <Badge variant="solid">Birincil</Badge> : null}
                      </p>
                      {image.alt_text ? <p className="text-xs text-foreground/50">{image.alt_text}</p> : null}
                      <p className="text-xs text-foreground/50">Sıra: {image.sort_order}</p>

                      {/* Native <details> — brands/categories ile aynı, ekstra client state dosyası gerektirmeyen düzenle-açılır deseni. */}
                      <details className="mt-1">
                        <summary className="cursor-pointer list-none text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                          Düzenle
                        </summary>
                        <div className="mt-2 max-w-md rounded-md border border-black/10 p-3">
                          <ProductImageForm
                            mode="edit"
                            initialValues={{
                              storagePath: image.storage_path,
                              altText: image.alt_text ?? "",
                              sortOrder: image.sort_order,
                            }}
                            action={updateAction}
                            submitLabel="Değişiklikleri Kaydet"
                          />
                        </div>
                      </details>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!image.is_primary ? (
                      <form action={setPrimary}>
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
                        >
                          Birincil Yap
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline"
                      >
                        Sil
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-black/10 pt-4">
          <h2 className="text-sm font-semibold tracking-tight">Yeni Görsel</h2>
          <div className="mt-3">
            <ProductImageForm mode="create" showIsPrimary action={createAction} submitLabel="+ Görsel Ekle" />
          </div>
        </div>
      </div>
    </div>
  );
}
