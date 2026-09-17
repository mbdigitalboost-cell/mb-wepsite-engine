import { z } from "zod";
import { optionalSafeNavigationUrlSchema } from "@/lib/validation/safe-url";

/**
 * FAZ 2C-2 — Product Add-on (store_editor+ writes; permanent delete is
 * store_admin+ only — same split as every other commerce table). Mirrors
 * migration 0022_product_addons.sql's `product_addons` table exactly.
 *
 * productId is required — same-store correctness is enforced by the DB's
 * composite FK (product_id, store_id), not here (see
 * lib/validation/product-variant.ts's identical rationale). store_id
 * itself is never a field in this schema.
 *
 * CRITICAL — SERVER PRICING WARNING (bkz. FAZ 2C-2 mimari tasarım
 * raporu, FAZ 6): `priceDelta` burada SADECE admin'in bu add-on için DB'ye
 * kaydettiği fiyat farkını doğrular — bu asla müşterinin sepette/sipariş
 * sırasında gönderdiği bir TOPLAM fiyat değildir ve öyle KULLANILMAMALI.
 * Bu şema hiçbir toplam fiyat hesaplaması yapmaz, yapmamalı. İleride bir
 * sepete-ekleme/sipariş akışı geldiğinde, sunucu her zaman gerçek fiyatı
 * `productId`/`variantId`/seçilen add-on id'leri üzerinden DB'den TAZE
 * çekerek yeniden hesaplayacak (bkz. lib/commerce/pricing.ts, henüz
 * yazılmadı) — client'tan gelen hiçbir price/priceDelta/total alanı asla
 * doğrudan bir insert/update'e yazılmayacak. Bu admin formu (store_editor+
 * arkasında, requireStoreEditorAccess) ile storefront'un müşteri girişi
 * ASLA aynı güven seviyesinde değildir.
 *
 * sku: DELİBERATE OLARAK OPTIONAL/NULLABLE — products.sku/product_variants.sku'nun
 * aksine (o ikisi DB'de nullable olsa da validation katmanında bilinçli
 * olarak ZORUNLU tutulur, bkz. lib/validation/product.ts'in kendi
 * yorumu), burada DB'nin kendi nullable sku sütunuyla AYNI gevşeklik
 * validation katmanına da yansıtılıyor — bir "Yan Cep" add-on'unun kendi
 * SKU'su olmayabilir, bu üründe/variant'ta olduğu gibi bir admin-UX
 * sıkılaştırması gerektirmiyor.
 *
 * imageUrl: category/brand/homepage-section ile AYNI safe-navigation-url
 * allowlist'i kullanır (lib/validation/safe-url.ts) — asla bir bare
 * `z.string().url()` değil. Yalnızca site-içi göreli path ya da
 * `https://` bağlantısı kabul edilir; `javascript:`/`data:`/vb. hiçbir
 * şema bu iki şeklin prefix kuralına uymadığı için otomatik reddedilir —
 * XSS/unsafe HTML render riski taşıyan hiçbir değer bu alandan geçemez.
 *
 * FORM DATA NORMALIZATION (bir sonraki adımda yazılacak server action
 * için not): mevcut her actions.ts (products/actions.ts,
 * images/actions.ts) FormData'nın `null`/`""` değerlerini bu şemaya
 * ulaşmadan ÖNCE, kendi `read*FormValues()` yardımcı fonksiyonunda
 * normalize eder — ör. `formData.get("compareAtPrice") || undefined`,
 * `formData.get("variantId") || undefined`. Bu şemadaki her optional
 * `z.coerce.number()`/boolean alanı da AYNI disiplini bekler: `stock`/
 * `priceDelta` gibi bir alan için boş string ("") ASLA doğrudan bu
 * şemaya geçirilmemeli (z.coerce.number() "" değerini 0'a çevirir, bu da
 * "değer girilmedi" ile "0 girildi" anlamlarını YANLIŞ ŞEKİLDE
 * karıştırır) — çağıran kod boş string'i `undefined`'a çevirmeli, tıpkı
 * product-variant.ts'in `price`/`compareAtPrice` alanları için
 * products/actions.ts'nin zaten yaptığı gibi. Checkbox alanları
 * (`trackInventory`/`isRequired`/`isActive`) için de aynı repo-geneli
 * desen: formData.get() bir checkbox için "on" ya da null döner,
 * `z.coerce.boolean()` her iki ucu da doğru yorumlar (varlık/yokluk),
 * schema'nın kendisi bunu zaten `z.coerce.boolean()` ile ele alıyor.
 */
export const productAddonFormSchema = z.object({
  productId: z.string().uuid("Geçerli bir ürün seçilmeli."),
  name: z.string().trim().min(1, "Ek parça adı zorunlu.").max(200),
  sku: z.string().trim().max(100).optional().or(z.literal("")),
  /**
   * Ana ürün/variant fiyatına eklenecek FARK — mutlak/toplam fiyat
   * değildir (bkz. yukarıdaki CRITICAL uyarısı). numeric(12,2) DB
   * sütunuyla aynı, asla float/double güvenmiyoruz — bu sadece bir Zod
   * shape kontrolü, gerçek yuvarlama/hassasiyet DB'nin numeric(12,2)
   * tipinde yaşar.
   */
  priceDelta: z.coerce.number().min(0, "Fiyat farkı 0 veya daha büyük olmalı.").default(0),
  /** Nullable = stok takip edilmiyor/sınırsız — bkz. migration 0022'nin kendi yorumu. */
  stock: z.coerce.number().int().min(0, "Stok 0 veya daha büyük bir tam sayı olmalı.").optional(),
  trackInventory: z.coerce.boolean().default(true),
  imageUrl: optionalSafeNavigationUrlSchema(500),
  isRequired: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
});

export type ProductAddonFormValues = z.infer<typeof productAddonFormSchema>;
