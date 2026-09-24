import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inputClasses } from "@/lib/utils/input-classes";
import { bulkUpdateProductsAction, duplicateProductAction } from "./actions";
import { DuplicateProductButton } from "./duplicate-product-button";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  stock: number;
  is_active: boolean;
}

interface ProductsSearchParams {
  q?: string;
  categoryId?: string;
  brandId?: string;
  active?: string;
  page?: string;
}

const PAGE_SIZE = 20;

/**
 * PostgREST `.or()` treats `,()."` as syntax characters and `ilike`
 * treats `%`/`_` as wildcards — a raw search term containing any of them
 * would otherwise corrupt the filter (or, worse, let a user widen their
 * own search unexpectedly). `%`/`_` are backslash-escaped for ILIKE, then
 * the whole pattern is wrapped in double quotes (PostgREST's own escape
 * mechanism for values containing reserved filter characters), with `"`
 * and `\` themselves escaped first so the quoting can't be broken out of.
 */
function toSafeOrValue(pattern: string): string {
  const escaped = pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function toIlikePattern(term: string): string {
  return `%${term.replace(/[%_]/g, (match) => `\\${match}`)}%`;
}

/** Preserves every filter param except the ones overridden — used by pagination links and filter-clear links. */
function buildQuery(sp: ProductsSearchParams, overrides: Partial<ProductsSearchParams>): string {
  const merged = { ...sp, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.categoryId) params.set("categoryId", merged.categoryId);
  if (merged.brandId) params.set("brandId", merged.brandId);
  if (merged.active) params.set("active", merged.active);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * FAZ 2B — Products list, "list + new/[id]" route tree (content/[type]
 * ile aynı desen, navigation'ın flat-inline desenin AKSİNE — ürünün alan
 * sayısı/karmaşıklığı navigation/brand/category'den fazla olduğu için).
 * Arama (isim/sku) + kategori/marka/aktiflik filtresi + offset/limit
 * sayfalama — tamamı GET query string (searchParams) üzerinden, client-side
 * state/kütüphane YOK (mevcut "minimal JS" felsefesiyle tutarlı): filtre
 * formu `method="get"`, sayfalama düz `<Link>`ler.
 */
export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<ProductsSearchParams>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
    supabase.from("brands").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
  ]);

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("products")
    .select("id, name, slug, sku, price, stock, is_active", { count: "exact" })
    .eq("store_id", storeId);

  const q = sp.q?.trim();
  if (q) {
    const pattern = toSafeOrValue(toIlikePattern(q));
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  }
  if (sp.categoryId) query = query.eq("category_id", sp.categoryId);
  if (sp.brandId) query = query.eq("brand_id", sp.brandId);
  if (sp.active === "true") query = query.eq("is_active", true);
  if (sp.active === "false") query = query.eq("is_active", false);

  const { data: products, count } = await query
    .order("sort_order", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  const rows = (products ?? []) as ProductRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = `/dashboard/customers/${customerId}/stores/${storeId}/products`;

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
        <div className="flex items-center gap-2">
          <Button href={`${basePath}/import`} size="sm" variant="outline">
            İçe Aktar
          </Button>
          <Button href={`${basePath}/new`} size="sm">
            Yeni Ürün
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Ürün kataloğu. store_editor+ ekleyip düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="q" className="mb-1.5 block text-xs text-foreground/60">
            Ara (isim / SKU)
          </label>
          <input id="q" name="q" type="text" defaultValue={sp.q ?? ""} className={inputClasses} />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="categoryId" className="mb-1.5 block text-xs text-foreground/60">
            Kategori
          </label>
          <select id="categoryId" name="categoryId" defaultValue={sp.categoryId ?? ""} className={inputClasses}>
            <option value="">Tümü</option>
            {(categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="brandId" className="mb-1.5 block text-xs text-foreground/60">
            Marka
          </label>
          <select id="brandId" name="brandId" defaultValue={sp.brandId ?? ""} className={inputClasses}>
            <option value="">Tümü</option>
            {(brands ?? []).map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label htmlFor="active" className="mb-1.5 block text-xs text-foreground/60">
            Durum
          </label>
          <select id="active" name="active" defaultValue={sp.active ?? ""} className={inputClasses}>
            <option value="">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filtrele
        </Button>
        {sp.q || sp.categoryId || sp.brandId || sp.active ? (
          <Link href={basePath} className="text-xs text-foreground/50 underline-offset-2 hover:underline">
            Filtreleri temizle
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">
          {q || sp.categoryId || sp.brandId || sp.active ? "Filtrelere uyan ürün yok." : "Henüz ürün yok."}
        </p>
      ) : (
        /**
         * FAZ 2B-P1 — Toplu seçim/işlem formu. Bu, filtre formundan (yukarıda,
         * method="get") tamamen AYRI bir <form> — biri GET/query-string,
         * diğeri POST/server action, aynı DOM'da iç içe olamazlar (nested
         * <form> geçersizdir), bu yüzden ikisi kardeş elemanlar. İçindeki
         * <Link>ler normal şekilde çalışmaya devam eder — bir <form>,
         * içindeki <a> etiketlerinin navigasyonunu etkilemez, sadece
         * checkbox/select/button gibi form alanlarını toplar.
         */
        <form action={bulkUpdateProductsAction.bind(null, customerId, storeId)}>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
            <select name="bulkAction" defaultValue="activate" className={`${inputClasses} h-8 w-auto py-0 text-xs`}>
              <option value="activate">Seçilenleri Aktif Yap</option>
              <option value="deactivate">Seçilenleri Pasif Yap</option>
            </select>
            <Button type="submit" size="sm" variant="outline">
              Uygula
            </Button>
            <span>Kalıcı silme, ürün detay sayfasından tek tek yapılır.</span>
          </div>

          <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10">
            {rows.map((product) => (
              <li key={product.id} className="flex items-center gap-1 px-2">
                <input
                  type="checkbox"
                  name="productIds"
                  value={product.id}
                  aria-label={`${product.name} seç`}
                  className="h-4 w-4 shrink-0 rounded border-black/20"
                />
                <Link
                  href={`${basePath}/${product.id}`}
                  className="flex flex-1 flex-wrap items-center justify-between gap-2 px-2 py-3 text-sm hover:bg-brand-accent/5"
                >
                  <span>
                    <span className="font-medium text-foreground">{product.name}</span>{" "}
                    <span className="text-xs text-foreground/50">/{product.slug}</span>
                    {product.sku ? <span className="ml-2 text-xs text-foreground/50">SKU: {product.sku}</span> : null}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-foreground/50">
                    {product.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                    <span>Stok: {product.stock}</span>
                    <Badge variant={product.is_active ? "solid" : "outline"}>
                      {product.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </span>
                </Link>
                <DuplicateProductButton action={duplicateProductAction.bind(null, customerId, storeId, product.id)} />
              </li>
            ))}
          </ul>
        </form>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-foreground/60">
          <span>
            Sayfa {page} / {totalPages} ({totalCount} ürün)
          </span>
          <div className="flex items-center gap-3">
            {page > 1 ? (
              <Link href={`${basePath}${buildQuery(sp, { page: String(page - 1) })}`} className="underline-offset-2 hover:underline">
                ← Önceki
              </Link>
            ) : (
              <span className="opacity-30">← Önceki</span>
            )}
            {page < totalPages ? (
              <Link href={`${basePath}${buildQuery(sp, { page: String(page + 1) })}`} className="underline-offset-2 hover:underline">
                Sonraki →
              </Link>
            ) : (
              <span className="opacity-30">Sonraki →</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
