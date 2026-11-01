import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inputClasses } from "@/lib/utils/input-classes";
import { LOW_STOCK_THRESHOLD } from "@/lib/commerce/inventory";
import { bulkUpdateProductsAction, duplicateProductAction } from "./actions";
import { DuplicateProductButton } from "./duplicate-product-button";
import { ProductSearchInput } from "./product-search-input";
import { BulkActionControls } from "./bulk-action-controls";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  models: string[] | null;
  brand_id: string | null;
  price: number;
  stock: number;
  is_active: boolean;
}

interface ProductsSearchParams {
  q?: string;
  categoryId?: string;
  brandId?: string;
  active?: string;
  stock?: string;
  sort?: string;
  page?: string;
  /** Yalnızca bulkUpdateProductsAction'ın "deleteForever" redirect'inden gelir — buildQuery tarafından ASLA sayfalar arasında taşınmaz, tek seferlik bir banner. */
  bulkDeleted?: string;
  bulkSkipped?: string;
}

const PAGE_SIZE = 20;

/** Admin Panel İşlevsellik devir metni, Kısım C — isim/fiyat/stok/oluşturulma tarihi, artan/azalan. */
const SORT_OPTIONS: Record<string, { column: "name" | "price" | "stock" | "created_at"; ascending: boolean }> = {
  name_asc: { column: "name", ascending: true },
  name_desc: { column: "name", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  stock_asc: { column: "stock", ascending: true },
  stock_desc: { column: "stock", ascending: false },
  created_at_desc: { column: "created_at", ascending: false },
  created_at_asc: { column: "created_at", ascending: true },
};

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
  if (merged.stock) params.set("stock", merged.stock);
  if (merged.sort) params.set("sort", merged.sort);
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
    .select("id, name, slug, sku, models, brand_id, price, stock, is_active", { count: "exact" })
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

  // Admin Panel İşlevsellik devir metni, Kısım C — Stok filtresi, Kısım
  // B'nin "düşük stok" sayısıyla AYNI eşiği kullanıyor (LOW_STOCK_
  // THRESHOLD). "Stokta" = sınırsız takip (track_inventory=false) VEYA
  // eşiğin üzerinde stok — ikisi de .or() ile tek sorguda, ayrı bir
  // .eq("track_inventory", true) şartı GEREKMİYOR: track_inventory=false
  // olan satırlar birinci dalla, track_inventory=true VE stock>eşik olan
  // satırlar ikinci dalla zaten doğru şekilde yakalanıyor.
  if (sp.stock === "out") {
    query = query.eq("track_inventory", true).eq("stock", 0);
  } else if (sp.stock === "low") {
    query = query.eq("track_inventory", true).gt("stock", 0).lte("stock", LOW_STOCK_THRESHOLD);
  } else if (sp.stock === "in") {
    query = query.or(`track_inventory.eq.false,stock.gt.${LOW_STOCK_THRESHOLD}`);
  }

  const sortOption = sp.sort ? SORT_OPTIONS[sp.sort] : undefined;
  if (sortOption) {
    query = query.order(sortOption.column, { ascending: sortOption.ascending });
  } else {
    // Varsayılan — admin'in kendi elle sıraladığı sort_order, eski davranış.
    query = query.order("sort_order", { ascending: true });
  }

  const { data: products, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const rows = (products ?? []) as ProductRow[];
  // FAZ 7.1 — reuses the `brands` list already fetched above for the
  // filter dropdown (id, name) instead of a second query just to label
  // each row's brand_id.
  const brandNameById = new Map((brands ?? []).map((brand) => [brand.id, brand.name]));
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
        Ürün kataloğu. store_editor+ ekleyip düzenleyebilir; kalıcı silme (tekli veya toplu) store_admin+&apos;e ayrılmış ve
        sadece hiç sipariş edilmemiş ürünlerde mümkün.
      </p>

      {/*
        Admin Panel İşlevsellik devir metni, Kısım C — bulkUpdateProductsAction'ın
        "deleteForever" dalının redirect'iyle gelen tek seferlik sonuç
        banner'ı. buildQuery bu iki param'ı ASLA taşımadığı için bir
        sayfa yenileme/filtre değişikliğinde kendiliğinden kaybolur.
      */}
      {sp.bulkDeleted !== undefined || sp.bulkSkipped !== undefined ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          {sp.bulkDeleted} ürün kalıcı olarak silindi
          {Number(sp.bulkSkipped ?? 0) > 0
            ? `, ${sp.bulkSkipped} ürün sipariş geçmişi olduğu için atlandı (sipariş geçmişi korunuyor).`
            : "."}
        </p>
      ) : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="q" className="mb-1.5 block text-xs text-foreground/60">
            Ara (isim / SKU)
          </label>
          <ProductSearchInput basePath={basePath} initialValue={sp.q ?? ""} />
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
        <div className="min-w-[140px]">
          <label htmlFor="stock" className="mb-1.5 block text-xs text-foreground/60">
            Stok
          </label>
          <select id="stock" name="stock" defaultValue={sp.stock ?? ""} className={inputClasses}>
            <option value="">Tümü</option>
            <option value="in">Stokta</option>
            <option value="low">Düşük Stok</option>
            <option value="out">Tükendi</option>
          </select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="sort" className="mb-1.5 block text-xs text-foreground/60">
            Sırala
          </label>
          <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className={inputClasses}>
            <option value="">Varsayılan (manuel sıra)</option>
            <option value="name_asc">İsim (A-Z)</option>
            <option value="name_desc">İsim (Z-A)</option>
            <option value="price_asc">Fiyat (Düşük-Yüksek)</option>
            <option value="price_desc">Fiyat (Yüksek-Düşük)</option>
            <option value="stock_asc">Stok (Düşük-Yüksek)</option>
            <option value="stock_desc">Stok (Yüksek-Düşük)</option>
            <option value="created_at_desc">Eklenme Tarihi (Yeni-Eski)</option>
            <option value="created_at_asc">Eklenme Tarihi (Eski-Yeni)</option>
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filtrele
        </Button>
        {sp.q || sp.categoryId || sp.brandId || sp.active || sp.stock || sp.sort ? (
          <Link href={basePath} className="text-xs text-foreground/50 underline-offset-2 hover:underline">
            Filtreleri temizle
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">
          {q || sp.categoryId || sp.brandId || sp.active || sp.stock || sp.sort ? "Filtrelere uyan ürün yok." : "Henüz ürün yok."}
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
            <BulkActionControls categories={categories ?? []} />
            <span>Kalıcı sil: sipariş geçmişi olanlar otomatik atlanır.</span>
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
                    {product.brand_id && brandNameById.get(product.brand_id) ? (
                      <span className="ml-2 text-xs text-foreground/50">Marka: {brandNameById.get(product.brand_id)}</span>
                    ) : null}
                    {product.models && product.models.length > 0 ? (
                      <span className="ml-2 text-xs text-foreground/50">Model: {product.models.join(", ")}</span>
                    ) : null}
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
