"use client";

import { createContext, useActionState, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { initialProductFormState, type ProductFormState } from "./form-state";
import { CategoryPicker, type CategoryPickerOption } from "./category-picker";

/**
 * Faz 27 Kısım B — tek sayfa ürün formu (Shopify düzeni).
 *
 * Neden bağlam + `form` niteliği: ürünün temel alanları TEK bir form
 * (updateProductAction) ama sayfada aralarına kendi formları olan bölümler
 * giriyor (Görseller, Renk ve seçenekler, Ek ürün alanları — images-tab /
 * variants-tab / addons-tab, değişmeden). HTML iç içe forma izin vermez;
 * bu yüzden ProductFormRoot boş bir <form id> render eder ve her kart
 * kendi alanlarını `form={formId}` ile ona bağlar. Kaydet çubuğu da aynı
 * forma bağlı bir submit butonu. Sunucu tarafı (productFormSchema,
 * updateProductAction, fiyat hesabı) DEĞİŞMEDİ — aynı alan adları gider.
 */

export interface ProductFormValues {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  models: string[];
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  price: number;
  compareAtPrice: number | "";
  stock: number;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

interface FormCtx {
  formId: string;
  state: ProductFormState;
  pending: boolean;
}

const ProductFormContext = createContext<FormCtx | null>(null);

function useProductForm(): FormCtx {
  const ctx = useContext(ProductFormContext);
  if (!ctx) throw new Error("ProductForm kartları ProductFormRoot içinde kullanılmalı.");
  return ctx;
}

const fieldClasses =
  "w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-sm text-[#17171A] placeholder:text-[#A1A1AA] focus-visible:border-[#B34C00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B34C00]/15";
const labelClasses = "mb-1.5 block text-sm font-medium text-[#17171A]";

export function ProductCard({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <h2 className="text-sm font-semibold text-[#17171A]">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-[#71717A]">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProductFormRoot({
  action,
  children,
}: {
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialProductFormState);
  const formId = useId();
  return (
    <ProductFormContext.Provider value={{ formId, state, pending }}>
      <form id={formId} action={formAction} className="hidden" />
      {children}
    </ProductFormContext.Provider>
  );
}

export function ProductBasicsCard({ initial }: { initial: Pick<ProductFormValues, "name" | "shortDescription" | "description"> }) {
  const { formId } = useProductForm();
  return (
    <ProductCard title="Temel bilgiler">
      <div className="space-y-4">
        <div>
          <label htmlFor={`${formId}-name`} className={labelClasses}>
            Ürün adı
          </label>
          <input id={`${formId}-name`} form={formId} name="name" type="text" required defaultValue={initial.name} className={fieldClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-shortDescription`} className={labelClasses}>
            Kısa tanım <span className="font-normal text-[#A1A1AA]">(ürün sayfasında başlığın altında)</span>
          </label>
          <input
            id={`${formId}-shortDescription`}
            form={formId}
            name="shortDescription"
            type="text"
            defaultValue={initial.shortDescription}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-description`} className={labelClasses}>
            Açıklama
          </label>
          <textarea
            id={`${formId}-description`}
            form={formId}
            name="description"
            rows={7}
            defaultValue={initial.description}
            className={fieldClasses}
          />
          <p className="mt-1 text-xs text-[#71717A]">Alt alta yazılan kısa maddeler ürün sayfasında özellik kartı olarak gösterilir.</p>
        </div>
      </div>
    </ProductCard>
  );
}

export function ProductPricingCard({ initial }: { initial: Pick<ProductFormValues, "price" | "compareAtPrice"> }) {
  const { formId } = useProductForm();
  const [price, setPrice] = useState(String(initial.price));
  const [compare, setCompare] = useState(initial.compareAtPrice === "" ? "" : String(initial.compareAtPrice));
  const p = Number(price);
  const c = Number(compare);
  const discount = compare !== "" && c > p && p >= 0 ? Math.round(((c - p) / c) * 100) : null;
  return (
    <ProductCard title="Fiyat">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-price`} className={labelClasses}>
            Satış fiyatı (₺)
          </label>
          <input
            id={`${formId}-price`}
            form={formId}
            name="price"
            type="number"
            min={0}
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-compareAtPrice`} className={labelClasses}>
            Eski fiyat (₺) <span className="font-normal text-[#A1A1AA]">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-compareAtPrice`}
            form={formId}
            name="compareAtPrice"
            type="number"
            min={0}
            step="0.01"
            value={compare}
            onChange={(e) => setCompare(e.target.value)}
            className={fieldClasses}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#71717A]">
        {discount !== null ? (
          <>
            Mağazada <span className="font-semibold text-[#B34C00]">%{discount} indirim</span> rozeti ve &quot;
            {(c - p).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })} kazanıyorsunuz&quot; satırı otomatik görünür.
          </>
        ) : (
          "Eski fiyat satış fiyatından yüksekse indirim yüzdesi otomatik hesaplanır."
        )}
      </p>
    </ProductCard>
  );
}

export function ProductInventoryCard({
  initial,
  initialTrackInventory,
  hasVariants,
}: {
  initial: Pick<ProductFormValues, "sku" | "barcode" | "stock">;
  initialTrackInventory: boolean;
  hasVariants: boolean;
}) {
  const { formId } = useProductForm();
  return (
    <ProductCard
      title="Stok"
      description={hasVariants ? "Bu üründe renk/seçenek varyantları var: satılabilir stok her varyantın kendi stoğudur (aşağıdaki tablo)." : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${formId}-sku`} className={labelClasses}>
            Stok kodu (SKU)
          </label>
          <input id={`${formId}-sku`} form={formId} name="sku" type="text" required defaultValue={initial.sku} className={fieldClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-barcode`} className={labelClasses}>
            Barkod <span className="font-normal text-[#A1A1AA]">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-barcode`}
            form={formId}
            name="barcode"
            type="text"
            defaultValue={initial.barcode}
            placeholder="ör. 8699xxxxxxxxx"
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-stock`} className={labelClasses}>
            Adet
          </label>
          <input id={`${formId}-stock`} form={formId} name="stock" type="number" min={0} required defaultValue={initial.stock} className={fieldClasses} />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-[#17171A]">
        <input type="checkbox" form={formId} name="trackInventory" defaultChecked={initialTrackInventory} className="h-4 w-4 rounded border-[#D4D4D8] accent-[#B34C00]" />
        Stok takibi (mağazada &quot;Stokta N adet var&quot; satırı ve stok bitince satış engeli)
      </label>
    </ProductCard>
  );
}

export function ProductSeoCard({
  initial,
  storePathPrefix,
}: {
  initial: Pick<ProductFormValues, "slug" | "seoTitle" | "seoDescription" | "sortOrder" | "name">;
  storePathPrefix: string;
}) {
  const { formId } = useProductForm();
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.seoTitle);
  const [desc, setDesc] = useState(initial.seoDescription);
  return (
    <ProductCard title="Arama motoru görünümü" description="Google'da ve paylaşımlarda nasıl görüneceği.">
      <div className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFA] p-3">
        <p className="truncate text-xs text-[#3F7A3F]">
          {storePathPrefix}/urun/{slug || "urun-adi"}
        </p>
        <p className="mt-0.5 truncate text-base text-[#1A0DAB]">{title || initial.name || "Ürün adı"}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-[#4D5156]">{desc || "SEO açıklaması girilmezse arama motoru sayfadan bir özet seçer."}</p>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor={`${formId}-slug`} className={labelClasses}>
            Adres (slug)
          </label>
          <input
            id={`${formId}-slug`}
            form={formId}
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="urun-adi"
            className={`${fieldClasses} font-mono`}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-seoTitle`} className={labelClasses}>
            SEO başlık <span className="font-normal text-[#A1A1AA]">(opsiyonel)</span>
          </label>
          <input id={`${formId}-seoTitle`} form={formId} name="seoTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-seoDescription`} className={labelClasses}>
            SEO açıklama <span className="font-normal text-[#A1A1AA]">(opsiyonel)</span>
          </label>
          <textarea
            id={`${formId}-seoDescription`}
            form={formId}
            name="seoDescription"
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={fieldClasses}
          />
        </div>
        <div className="max-w-[160px]">
          <label htmlFor={`${formId}-sortOrder`} className={labelClasses}>
            Liste sırası
          </label>
          <input id={`${formId}-sortOrder`} form={formId} name="sortOrder" type="number" min={0} defaultValue={initial.sortOrder} className={fieldClasses} />
        </div>
      </div>
    </ProductCard>
  );
}

/** Sağ sütun — durum. "Taslak" = is_active false (ayrı bir durum kolonu YOK). */
export function ProductStatusCard({ initialIsActive }: { initialIsActive: boolean }) {
  const { formId } = useProductForm();
  const [active, setActive] = useState(initialIsActive);
  return (
    <ProductCard title="Durum">
      <div className="space-y-2">
        {[
          { value: true, label: "Yayında", hint: "Mağazada görünür ve satılır." },
          { value: false, label: "Taslak — yayında değil", hint: "Mağazada görünmez; hazırlık için." },
        ].map((option) => (
          <label
            key={String(option.value)}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm ${
              active === option.value ? "border-[#B34C00] bg-[#B34C00]/[0.04]" : "border-[#E4E4E7]"
            }`}
          >
            <input
              type="radio"
              checked={active === option.value}
              onChange={() => setActive(option.value)}
              className="mt-0.5 h-4 w-4 accent-[#B34C00]"
            />
            <span>
              <span className="block font-medium text-[#17171A]">{option.label}</span>
              <span className="block text-xs text-[#71717A]">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {active ? <input type="hidden" form={formId} name="isActive" value="on" /> : null}
    </ProductCard>
  );
}

export function ProductOrganizationCard({
  categoryOptions,
  initialCategoryIds,
  initialPrimaryCategoryId,
  brandOptions,
  initialBrandId,
  modelsByBrand,
  initialModels,
}: {
  categoryOptions: CategoryPickerOption[];
  initialCategoryIds: string[];
  initialPrimaryCategoryId: string | null;
  brandOptions: Array<{ id: string; name: string }>;
  initialBrandId: string;
  modelsByBrand: Record<string, string[]>;
  initialModels: string[];
}) {
  const { formId } = useProductForm();
  const [brandId, setBrandId] = useState(initialBrandId);
  const [models, setModels] = useState<string[]>(initialModels);
  const [modelInput, setModelInput] = useState("");
  const suggestions = useMemo(() => (modelsByBrand[brandId] ?? []).filter((m) => !models.includes(m)), [modelsByBrand, brandId, models]);

  function addModel(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setModels((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setModelInput("");
  }

  return (
    <ProductCard title="Ürün organizasyonu">
      <div className="space-y-5">
        <div>
          <p className={labelClasses}>Kategoriler</p>
          <CategoryPicker options={categoryOptions} initialSelectedIds={initialCategoryIds} initialPrimaryId={initialPrimaryCategoryId} form={formId} />
        </div>
        <div>
          <label htmlFor={`${formId}-brandId`} className={labelClasses}>
            Marka
          </label>
          <select
            id={`${formId}-brandId`}
            form={formId}
            name="brandId"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className={fieldClasses}
          >
            <option value="">— Yok —</option>
            {brandOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-modelInput`} className={labelClasses}>
            Uyumlu modeller
          </label>
          {models.map((model) => (
            <input key={model} type="hidden" form={formId} name="models" value={model} />
          ))}
          <div className="flex gap-2">
            <input
              id={`${formId}-modelInput`}
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addModel(modelInput);
                }
              }}
              placeholder="ör. TP9 + Enter"
              className={fieldClasses}
            />
            <button
              type="button"
              onClick={() => addModel(modelInput)}
              className="shrink-0 rounded-lg border border-[#E4E4E7] px-3 text-sm text-[#17171A] hover:border-[#B34C00]"
            >
              Ekle
            </button>
          </div>
          {models.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {models.map((model) => (
                <li key={model} className="inline-flex items-center gap-1 rounded-full bg-[#F4F4F5] px-2.5 py-1 text-xs text-[#17171A]">
                  {model}
                  <button
                    type="button"
                    onClick={() => setModels((prev) => prev.filter((m) => m !== model))}
                    aria-label={`${model} modelini kaldır`}
                    className="text-[#A1A1AA] hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {suggestions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => addModel(model)}
                  className="rounded-full border border-dashed border-[#D4D4D8] px-2.5 py-1 text-xs text-[#52525B] hover:border-[#B34C00]"
                >
                  + {model}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </ProductCard>
  );
}

/** Altta sabit Kaydet çubuğu — aynı forma bağlı submit. */
export function ProductSaveBar({ label }: { label: string }) {
  const { formId, state, pending } = useProductForm();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) setSaved(!state.error);
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-[#E4E4E7] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error ? (
          <p role="alert" className="mr-auto text-sm text-red-600">
            {state.error}
          </p>
        ) : saved ? (
          <p className="mr-auto text-sm text-green-700">Kaydedildi.</p>
        ) : (
          <p className="mr-auto text-xs text-[#71717A]">Görsel, renk ve ek alan değişiklikleri kendi bölümlerinde anında kaydedilir.</p>
        )}
        <button
          type="submit"
          form={formId}
          disabled={pending}
          onClick={() => setSaved(false)}
          className="inline-flex h-10 items-center rounded-lg bg-[#17171A] px-5 text-sm font-semibold text-white hover:bg-[#2A2A2E] disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : label}
        </button>
      </div>
    </div>
  );
}
