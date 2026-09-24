import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validation/product";
import { slugifyProductName } from "./slugify";
import type { RawImportRow } from "./product-import-columns";

export interface ValidImportRow {
  status: "valid";
  fileRowNumber: number;
  action: "insert" | "update";
  existingProductId: string | null;
  data: {
    name: string;
    slug: string;
    sku: string;
    barcode: string | null;
    model: string | null;
    shortDescription: string | null;
    description: string | null;
    categoryId: string | null;
    brandId: string | null;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    isActive: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
  };
}

export interface InvalidImportRow {
  status: "error";
  fileRowNumber: number;
  errors: string[];
}

export type ImportRowResult = ValidImportRow | InvalidImportRow;

export type ValidateImportRowsResult = { ok: true; results: ImportRowResult[] } | { ok: false; error: string };

/**
 * Cells starting with these characters open a formula in Excel/Sheets IF
 * the value is later re-exported to a spreadsheet and reopened. This repo
 * has no export feature today, so the CURRENT blast radius is limited —
 * but this turn's own instruction ("formula injection riskini düşün") is
 * treated as forward-looking. The row is REJECTED with a visible error,
 * never silently stripped/rewritten — STEP 26's own "kullanıcı verisini
 * sessizce değiştirme" rule rules out auto-sanitizing.
 */
const FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function hasFormulaInjectionRisk(value: string): boolean {
  return value.length > 0 && FORMULA_INJECTION_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function parseBooleanField(raw: string | undefined): { value: boolean; error: string | null } {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return { value: true, error: null }; // Blank => Aktif, matches product-form.tsx's own create-time default.
  if (["evet", "true", "1", "aktif"].includes(v)) return { value: true, error: null };
  if (["hayır", "hayir", "false", "0", "pasif"].includes(v)) return { value: false, error: null };
  return {
    value: true,
    error: `Geçersiz "Aktif" değeri: "${raw}" (beklenen: Evet/Hayır, Aktif/Pasif, true/false, 1/0).`,
  };
}

/**
 * Deliberately strict, not locale-guessing: only a plain `-?digits(.digits)?`
 * shape is accepted. A comma decimal, currency symbol, or thousands
 * separator is rejected with a clear message rather than silently
 * reinterpreted — guessing wrong would write the wrong price to a real
 * store's catalog.
 */
function parseNumberField(
  raw: string | undefined,
  label: string,
  required: boolean,
): { value: number | undefined; error: string | null } {
  const v = (raw ?? "").trim();
  if (v === "") {
    return required ? { value: undefined, error: `${label} zorunlu.` } : { value: undefined, error: null };
  }
  if (!/^-?\d+(\.\d+)?$/.test(v)) {
    return {
      value: undefined,
      error: `${label} geçersiz sayı formatı: "${raw}" (beklenen: 1500 veya 1500.00 — binlik ayırıcı/para simgesi kullanmayın).`,
    };
  }
  return { value: Number(v), error: null };
}

/**
 * FAZ 2C-7 STEP 26 — read-only. Never writes. Prefetches this store's
 * categories/brands/products ONCE (not per row) so a 40-500 row file
 * costs 3 queries total, not up to 5×N — resolution itself is then
 * synchronous, in-memory name lookups. Category/brand lookups are
 * store-scoped ONLY (`.eq("store_id", storeId)`) — a name that exists in
 * a different store is invisible here, exactly like this turn's own
 * requirement ("başka store'daki kategoriye kesinlikle bakma").
 */
export async function validateImportRows(storeId: string, rawRows: RawImportRow[]): Promise<ValidateImportRowsResult> {
  const supabase = await createSupabaseServerClient();

  const [categoriesResult, brandsResult, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id").eq("store_id", storeId),
    supabase.from("brands").select("id, name").eq("store_id", storeId),
    supabase.from("products").select("id, sku, slug, barcode").eq("store_id", storeId),
  ]);

  if (categoriesResult.error || brandsResult.error || productsResult.error) {
    const message =
      categoriesResult.error?.message ?? brandsResult.error?.message ?? productsResult.error?.message ?? "bilinmeyen hata";
    return { ok: false, error: `Referans veriler okunamadı: ${message}` };
  }

  const categoriesByName = new Map((categoriesResult.data ?? []).map((c) => [c.name, c]));
  const brandsByName = new Map((brandsResult.data ?? []).map((b) => [b.name, b]));
  const productsBySku = new Map(
    (productsResult.data ?? []).filter((p): p is typeof p & { sku: string } => Boolean(p.sku)).map((p) => [p.sku, p]),
  );
  const productsBySlug = new Map((productsResult.data ?? []).map((p) => [p.slug, p]));
  // barcode is nullable/optional (unlike sku/slug) — only rows that actually
  // HAVE an existing barcode go in this map, same reasoning as productsBySku.
  const productsByBarcode = new Map(
    (productsResult.data ?? [])
      .filter((p): p is typeof p & { barcode: string } => Boolean(p.barcode))
      .map((p) => [p.barcode, p]),
  );

  function resolveCategoryId(categoryName: string, subcategoryName: string): { id: string | null; error: string | null } {
    if (!categoryName && !subcategoryName) return { id: null, error: null };
    if (!categoryName && subcategoryName) {
      return {
        id: null,
        error: `Alt Kategori ("${subcategoryName}") verildi ama Kategori boş — üst kategori olmadan alt kategori doğrulanamaz.`,
      };
    }

    const parent = categoriesByName.get(categoryName);
    if (!parent) return { id: null, error: `Kategori bulunamadı: "${categoryName}".` };

    if (!subcategoryName) return { id: parent.id, error: null };

    const child = categoriesByName.get(subcategoryName);
    if (!child) return { id: null, error: `Alt kategori bulunamadı: "${subcategoryName}".` };
    if (child.parent_id !== parent.id) {
      return { id: null, error: `Alt kategori "${subcategoryName}", "${categoryName}" kategorisine ait değil.` };
    }
    return { id: child.id, error: null };
  }

  function resolveBrandId(brandName: string): { id: string | null; error: string | null } {
    if (!brandName) return { id: null, error: null };
    const brand = brandsByName.get(brandName);
    if (!brand) return { id: null, error: `Marka bulunamadı: "${brandName}".` };
    return { id: brand.id, error: null };
  }

  const results: ImportRowResult[] = [];
  const seenSkusInFile = new Map<string, number>();
  const seenSlugsInFile = new Map<string, number>();
  const seenBarcodesInFile = new Map<string, number>();

  for (const raw of rawRows) {
    const errors: string[] = [];
    const v = raw.values;

    const freeTextFields: Array<[string, string | undefined]> = [
      ["Ürün Adı", v["Ürün Adı"]],
      ["Kısa Açıklama", v["Kısa Açıklama"]],
      ["Açıklama", v["Açıklama"]],
      ["Model", v["Model"]],
      ["SEO Başlık", v["SEO Başlık"]],
      ["SEO Açıklama", v["SEO Açıklama"]],
    ];
    for (const [label, value] of freeTextFields) {
      if (value && hasFormulaInjectionRisk(value)) {
        errors.push(
          `${label} alanı "=, +, -, @" gibi bir karakterle başlıyor (formül enjeksiyonu riski) — satır elle düzeltilmeli, otomatik temizlenmedi.`,
        );
      }
    }

    const name = v["Ürün Adı"] ?? "";
    if (!name) errors.push("Ürün Adı zorunlu.");

    const sku = v["SKU"] ?? "";
    if (!sku) errors.push("SKU zorunlu.");

    let slug = v["Slug"] ?? "";
    if (!slug && name) slug = slugifyProductName(name);

    const barcode = v["Barkod"] ?? "";

    const { value: price, error: priceError } = parseNumberField(v["Fiyat"], "Fiyat", true);
    if (priceError) errors.push(priceError);
    const { value: compareAtPrice, error: compareError } = parseNumberField(v["Eski Fiyat"], "Eski Fiyat", false);
    if (compareError) errors.push(compareError);
    const { value: stock, error: stockError } = parseNumberField(v["Stok"], "Stok", true);
    if (stockError) errors.push(stockError);

    const { value: isActive, error: activeError } = parseBooleanField(v["Aktif"]);
    if (activeError) errors.push(activeError);

    const { id: categoryId, error: categoryError } = resolveCategoryId(v["Kategori"] ?? "", v["Alt Kategori"] ?? "");
    if (categoryError) errors.push(categoryError);

    const { id: brandId, error: brandError } = resolveBrandId(v["Marka"] ?? "");
    if (brandError) errors.push(brandError);

    if (sku) {
      const firstSeenAt = seenSkusInFile.get(sku);
      if (firstSeenAt !== undefined) {
        errors.push(`Bu SKU dosya içinde tekrar ediyor (ilk görüldüğü satır: ${firstSeenAt}).`);
      } else {
        seenSkusInFile.set(sku, raw.fileRowNumber);
      }
    }
    if (slug) {
      const firstSeenAt = seenSlugsInFile.get(slug);
      if (firstSeenAt !== undefined) {
        errors.push(`Bu slug dosya içinde tekrar ediyor (ilk görüldüğü satır: ${firstSeenAt}).`);
      } else {
        seenSlugsInFile.set(slug, raw.fileRowNumber);
      }
    }
    if (barcode) {
      const firstSeenAt = seenBarcodesInFile.get(barcode);
      if (firstSeenAt !== undefined) {
        errors.push(`Bu barkod dosya içinde tekrar ediyor (ilk görüldüğü satır: ${firstSeenAt}).`);
      } else {
        seenBarcodesInFile.set(barcode, raw.fileRowNumber);
      }
    }

    if (errors.length > 0) {
      results.push({ status: "error", fileRowNumber: raw.fileRowNumber, errors });
      continue;
    }

    // Same schema, same rules as the manual create/update form — import
    // rows are never held to looser validation than product-form.tsx.
    const parsed = productFormSchema.safeParse({
      name,
      slug,
      sku,
      model: v["Model"] ?? "",
      shortDescription: v["Kısa Açıklama"] ?? "",
      description: v["Açıklama"] ?? "",
      categoryId: categoryId ?? "",
      brandId: brandId ?? "",
      price,
      compareAtPrice,
      stock,
      trackInventory: true,
      isActive,
      sortOrder: 0,
      seoTitle: v["SEO Başlık"] ?? "",
      seoDescription: v["SEO Açıklama"] ?? "",
      barcode,
    });

    if (!parsed.success) {
      results.push({
        status: "error",
        fileRowNumber: raw.fileRowNumber,
        errors: parsed.error.issues.map((issue) => issue.message),
      });
      continue;
    }

    // SKU-based upsert match, store-scoped — mirrors products_sku_unique
    // (store_id, sku) exactly. "SKU mevcutsa UPDATE, yoksa yeni ürün" per
    // this turn's own spec — see STEP 26 report's "SKU upsert mantığı".
    const existingBySku = productsBySku.get(parsed.data.sku);

    // Slug collision: a DIFFERENT existing product already owns this slug.
    const slugOwner = productsBySlug.get(parsed.data.slug);
    if (slugOwner && slugOwner.id !== existingBySku?.id) {
      results.push({
        status: "error",
        fileRowNumber: raw.fileRowNumber,
        errors: [`Bu slug ("${parsed.data.slug}") bu mağazada başka bir ürün tarafından zaten kullanılıyor.`],
      });
      continue;
    }

    // Same shape as the slug check above, but barcode is optional — only
    // checked when the row actually has one. Without this, a barcode clash
    // would only surface at commit time as a raw, untranslated Postgres
    // 23505 error (see commitImportAction's own defense-in-depth catch for
    // the remaining race-condition case this preview-time check can't see).
    const barcodeOwner = parsed.data.barcode ? productsByBarcode.get(parsed.data.barcode) : undefined;
    if (barcodeOwner && barcodeOwner.id !== existingBySku?.id) {
      results.push({
        status: "error",
        fileRowNumber: raw.fileRowNumber,
        errors: [`Bu barkod ("${parsed.data.barcode}") bu mağazada başka bir ürün tarafından zaten kullanılıyor.`],
      });
      continue;
    }

    results.push({
      status: "valid",
      fileRowNumber: raw.fileRowNumber,
      action: existingBySku ? "update" : "insert",
      existingProductId: existingBySku?.id ?? null,
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        sku: parsed.data.sku,
        barcode: parsed.data.barcode || null,
        model: parsed.data.model || null,
        shortDescription: parsed.data.shortDescription || null,
        description: parsed.data.description || null,
        categoryId: parsed.data.categoryId || null,
        brandId: parsed.data.brandId || null,
        price: parsed.data.price,
        compareAtPrice: parsed.data.compareAtPrice ?? null,
        stock: parsed.data.stock,
        isActive: parsed.data.isActive,
        seoTitle: parsed.data.seoTitle || null,
        seoDescription: parsed.data.seoDescription || null,
      },
    });
  }

  return { ok: true, results };
}
