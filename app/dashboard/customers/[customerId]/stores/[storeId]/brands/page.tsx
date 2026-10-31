import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBrandModelsGroupedByBrand } from "@/lib/commerce/brand-models";
import {
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
  uploadBrandLogoAction,
  addBrandModelAction,
  deleteBrandModelAction,
  moveBrandModelAction,
} from "./actions";
import { BrandForm } from "./brand-form";
import { BrandLogoForm } from "./brand-logo-form";
import { BrandModelsPanel } from "./brand-models-panel";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

/**
 * FAZ 2B — Brands, flat inline CRUD (audit'te önerilen desen — navigation/
 * settings ile aynı: tek page.tsx, ayrı new/[id] route'u yok, N küçük
 * varsayımı). Read access `requireStoreAccess` (store_viewer+, sayfayı
 * görebilme) — her satırın kendi Edit/Delete formu kendi
 * requireStoreEditorAccess/requireStoreAdminAccess'ini action içinde
 * BAĞIMSIZ olarak çağırır (navigation/page.tsx'teki AYNI desen: buton her
 * zaman render edilir, yetki kontrolü SADECE action'da yapılır — sayfa
 * burada rolü ayrımsayıp butonu gizlemiyor).
 */
export default async function StoreBrandsPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const [{ data: brands }, { data: productRows }, modelsByBrand] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, slug, description, logo_url, is_active, seo_title, seo_description")
      .eq("store_id", storeId)
      .order("name", { ascending: true }),
    // Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C —
    // "Markalar ve Modeller" ekranındaki "X ürün" sayısı GERÇEK, canlı
    // sayım (uydurma/sabit sayı yok). Ayrı bir count-per-brand RPC yerine
    // tek bir ucuz sorgu (bu katalog ölçeğinde, bugün ~2 ürün) +
    // client-side gruplama — getPublicBestSellingProducts'ın da izlediği
    // AYNI "küçük ölçekte tek sorgu + grupla" deseni.
    supabase.from("products").select("brand_id").eq("store_id", storeId).not("brand_id", "is", null),
    getBrandModelsGroupedByBrand(storeId),
  ]);

  const productCountByBrand = new Map<string, number>();
  for (const row of productRows ?? []) {
    if (!row.brand_id) continue;
    productCountByBrand.set(row.brand_id, (productCountByBrand.get(row.brand_id) ?? 0) + 1);
  }

  const rows = (brands ?? []) as BrandRow[];
  const createAction = createBrandAction.bind(null, customerId, storeId);

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Markalar ve Modeller</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Ürün markaları + her markanın merkezi model kataloğu (storefront &quot;Silahını Seç&quot; akışının model
        listesi buradan geliyor). store_editor+ ekleyip düzenleyebilir, model ekleyebilir; logo yükleme ve kalıcı
        silme store_admin+&apos;e ayrılmış.
      </p>

      <div className="mt-6 rounded-lg border border-black/10 p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-foreground/60">Henüz marka yok.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {rows.map((brand) => {
              const updateAction = updateBrandAction.bind(null, customerId, storeId, brand.id);
              const deleteAction = deleteBrandAction.bind(null, customerId, storeId, brand.id);
              const logoAction = uploadBrandLogoAction.bind(null, customerId, storeId, brand.id);
              const addModelAction = addBrandModelAction.bind(null, customerId, storeId, brand.id);
              const deleteModelAction = deleteBrandModelAction.bind(null, customerId, storeId, brand.id);
              const moveModelAction = (modelId: string, direction: "up" | "down") =>
                moveBrandModelAction(customerId, storeId, brand.id, modelId, direction);
              const brandModels = modelsByBrand[brand.id] ?? [];
              const productCount = productCountByBrand.get(brand.id) ?? 0;

              return (
                <li key={brand.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                  <div className="min-w-[200px] flex-1">
                    <div className="flex items-center gap-2">
                      {brand.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- store-branding public bucket URL (Faz 10 pattern), small admin thumbnail.
                        <img src={brand.logo_url} alt={brand.name} className="h-6 w-6 rounded border border-black/10 object-contain" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded border border-black/10 text-[10px] font-semibold text-foreground/50">
                          {brand.name.charAt(0).toLocaleUpperCase("tr")}
                        </span>
                      )}
                      <p className="font-medium text-foreground">
                        {brand.name}{" "}
                        {!brand.is_active ? <span className="text-xs text-foreground/40">(pasif)</span> : null}
                      </p>
                    </div>
                    <p className="text-xs text-foreground/50">
                      /{brand.slug} · {productCount} ürün · {brandModels.length} model
                    </p>

                    {/* Native <details> — no client state file needed for the
                        collapse-to-edit behavior (mirrors navigation's
                        EditItemForm collapse, but zero-JS). */}
                    <details className="mt-1">
                      <summary className="cursor-pointer list-none text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                        Düzenle
                      </summary>
                      <div className="mt-2 max-w-md space-y-4 rounded-md border border-black/10 p-3">
                        <BrandForm
                          initialValues={{
                            name: brand.name,
                            slug: brand.slug,
                            description: brand.description ?? "",
                            logoUrl: brand.logo_url ?? "",
                            seoTitle: brand.seo_title ?? "",
                            seoDescription: brand.seo_description ?? "",
                          }}
                          initialIsActive={brand.is_active}
                          action={updateAction}
                          submitLabel="Değişiklikleri Kaydet"
                        />

                        <div className="border-t border-black/10 pt-3">
                          <BrandLogoForm currentLogoUrl={brand.logo_url} brandName={brand.name} action={logoAction} />
                        </div>

                        <div className="border-t border-black/10 pt-3">
                          <BrandModelsPanel
                            models={brandModels}
                            addAction={addModelAction}
                            deleteAction={deleteModelAction}
                            moveUpAction={(modelId) => moveModelAction(modelId, "up")}
                            moveDownAction={(modelId) => moveModelAction(modelId, "down")}
                          />
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="flex items-center gap-1">
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
          <h2 className="text-sm font-semibold tracking-tight">Yeni Marka</h2>
          <div className="mt-3">
            <BrandForm action={createAction} submitLabel="+ Marka Ekle" />
          </div>
        </div>
      </div>
    </div>
  );
}
