import type { CustomerDiscountType, CustomerDiscountValueType } from "@/lib/supabase/types";

/**
 * Faz 32 — İNDİRİM KURALLARI (saf, testli: tests/checkout-discount.test.ts).
 * Önceden lib/commerce/discounts.ts içindeydi; veri erişimi artık bir
 * DiscountDataSource arayüzü üzerinden verildiği için aynı kurallar hem
 * sunucuda (Supabase service-role) hem testte (bellek-içi iki mağazalı veri)
 * çalışır. Önizleme (previewCheckoutAction) ve sipariş (createOrderAction)
 * AYNI resolveDiscount'u çağırır — ikinci bir hesap kopyası yok.
 *
 * Kurallar:
 *  - Kod araması YALNIZ verilen storeId'nin aktif 'code' satırlarında
 *    (Faz 28/29 izolasyonu): başka mağazanın kodu "invalid_code".
 *  - Karşılaştırma büyük/küçük harf duyarsız, baş/son boşluk kırpılmış
 *    (eski davranışla aynı; DB'deki unique index de upper(code) üzerinde).
 *  - Süresi dolmuş ya da pasif kod → "invalid_code".
 *  - Kod bir müşteriye tanımlıdır (0036 target_check — her kod ya bir
 *    store_customer'a ya da misafir e-posta/telefona bağlı):
 *      · hesaba bağlı kod + oturum yok        → "login_required"
 *      · hesaba bağlı kod + başka hesap        → "invalid_code" (genel)
 *      · misafire bağlı kod + iletişim uyuşmuyor → "invalid_code" (genel)
 *    (Faz 32 öncesi kod tek başına yeterli sayılıyordu; artık hedef
 *    müşteriyle eşleşmesi gerekiyor.)
 *  - Kod girildiyse ve geçersizse SESSİZCE 'auto'ya düşülmez (çağıran
 *    müşteriye nedenini gösterir). Kod boşsa yalnız 'auto' denenir ve
 *    şartları tutmuyorsa sessizce "none".
 *  - İkisi ASLA üst üste binmez; girilen kod kazanır.
 */

export interface DiscountRow {
  id: string;
  discount_type: CustomerDiscountType;
  code: string | null;
  value_type: CustomerDiscountValueType;
  value: number;
  expires_at: string | null;
  max_uses: number | null;
  min_order_amount: number | null;
  store_customer_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
}

export interface ResolvedDiscount {
  id: string;
  discountType: CustomerDiscountType;
  valueType: CustomerDiscountValueType;
  value: number;
  /** orders.discount_code snapshot'ı — 'auto' için null (kod yok). */
  code: string | null;
  /** Sunucuda hesaplanan TL tutarı, [0, subtotal] aralığına kırpılmış. */
  amount: number;
}

export type DiscountResolution =
  | { status: "applied"; discount: ResolvedDiscount }
  | { status: "invalid_code" }
  | { status: "min_order_not_met"; minOrderAmount: number }
  | { status: "usage_limit_reached" }
  | { status: "login_required" }
  | { status: "rate_limited" }
  | { status: "none" };

/** Veri erişimi — sunucuda Supabase (lib/commerce/discounts.ts), testte bellek. */
export interface DiscountDataSource {
  /** Mağazanın AKTİF 'code' satırları; sorgu hatasında null. */
  listActiveCodes(storeId: string): Promise<DiscountRow[] | null>;
  findStoreCustomerId(storeId: string, userId: string): Promise<string | null>;
  findActiveAuto(storeId: string, storeCustomerId: string): Promise<DiscountRow | null>;
  /** Kaç siparişte kullanıldı; sorgu hatasında +Infinity (fail-closed: "dolu"). */
  countUsage(discountId: string): Promise<number>;
}

export interface DiscountRequest {
  storeId: string;
  subtotal: number;
  /** Oturumdaki vitrin müşterisinin auth id'si; misafirde null. */
  userId: string | null;
  /** Oturumun e-postası (varsa) — misafire tanımlı bir kodu sonradan üye olmuş kişi de kullanabilsin. */
  userEmail?: string | null;
  enteredCode?: string | null;
  /** Ödeme formundaki iletişim bilgisi (misafire tanımlı kod eşleşmesi için). */
  contact?: { email?: string | null; phone?: string | null };
  now?: Date;
}

export function normalizeDiscountCode(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().toUpperCase();
  return value || null;
}

/** Telefonu karşılaştırılabilir hâle getirir: yalnız rakamlar, son 10 hane (0/90 ön ekleri düşer). */
export function normalizePhoneForMatch(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

function normalizeEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase();
  return value || null;
}

export type CodeTargetCheck = "ok" | "login_required" | "not_eligible";

/** Kodun hedef müşterisi bu ziyaretçi mi? */
export function checkCodeTarget(
  row: Pick<DiscountRow, "store_customer_id" | "guest_email" | "guest_phone">,
  viewer: { userId: string | null; storeCustomerId: string | null; emails: Array<string | null | undefined>; phones: Array<string | null | undefined> },
): CodeTargetCheck {
  if (row.store_customer_id) {
    if (!viewer.userId) return "login_required";
    return viewer.storeCustomerId === row.store_customer_id ? "ok" : "not_eligible";
  }
  const targetEmail = normalizeEmail(row.guest_email);
  const targetPhone = normalizePhoneForMatch(row.guest_phone);
  if (targetEmail && viewer.emails.some((email) => normalizeEmail(email) === targetEmail)) return "ok";
  if (targetPhone && viewer.phones.some((phone) => normalizePhoneForMatch(phone) === targetPhone)) return "ok";
  return "not_eligible";
}

export function buildResolvedDiscount(row: DiscountRow, subtotal: number): ResolvedDiscount {
  const rawAmount = row.value_type === "percentage" ? (subtotal * Number(row.value)) / 100 : Number(row.value);
  // orders_discount_amount_le_subtotal CHECK'i zaten reddederdi; kırpmak,
  // yanlış ayarlanmış büyük bir sabit indirimde DB hatası yerine %100 indirim verir.
  const amount = Math.max(0, Math.min(rawAmount, subtotal));
  return {
    id: row.id,
    discountType: row.discount_type,
    valueType: row.value_type,
    value: Number(row.value),
    code: row.discount_type === "code" ? row.code : null,
    amount: Math.round(amount * 100) / 100,
  };
}

async function checkLimitsAndBuild(ds: DiscountDataSource, row: DiscountRow, subtotal: number, silent: boolean): Promise<DiscountResolution> {
  if (row.min_order_amount !== null && subtotal < Number(row.min_order_amount)) {
    return silent ? { status: "none" } : { status: "min_order_not_met", minOrderAmount: Number(row.min_order_amount) };
  }
  if (row.max_uses !== null) {
    const usage = await ds.countUsage(row.id);
    if (usage >= row.max_uses) return silent ? { status: "none" } : { status: "usage_limit_reached" };
  }
  return { status: "applied", discount: buildResolvedDiscount(row, subtotal) };
}

/**
 * DÜRÜSTLÜK NOTU (Faz 12'den): max_uses kontrolü okuma ile sipariş yazımı
 * arasında tek transaction değil — iki eşzamanlı checkout limiti bir fazla
 * aşabilir. Küçük ölçekli kişi başı indirim için kabul edilmiş risk.
 */
export async function resolveDiscount(ds: DiscountDataSource, request: DiscountRequest): Promise<DiscountResolution> {
  const { storeId, subtotal, userId } = request;
  const now = request.now ?? new Date();
  const code = normalizeDiscountCode(request.enteredCode);
  const storeCustomerId = userId ? await ds.findStoreCustomerId(storeId, userId) : null;

  if (code) {
    const rows = await ds.listActiveCodes(storeId);
    if (!rows) return { status: "invalid_code" };
    const match = rows.find(
      (row) => row.discount_type === "code" && normalizeDiscountCode(row.code) === code && !isDiscountExpired(row.expires_at, now),
    );
    if (!match) return { status: "invalid_code" };

    const target = checkCodeTarget(match, {
      userId,
      storeCustomerId,
      emails: [request.userEmail, request.contact?.email],
      phones: [request.contact?.phone],
    });
    if (target === "login_required") return { status: "login_required" };
    if (target === "not_eligible") return { status: "invalid_code" };

    return checkLimitsAndBuild(ds, match, subtotal, false);
  }

  if (!storeCustomerId) return { status: "none" };
  const autoRow = await ds.findActiveAuto(storeId, storeCustomerId);
  if (!autoRow) return { status: "none" };
  if (isDiscountExpired(autoRow.expires_at, now)) return { status: "none" };
  // 'auto' pasif bir avantaj — görünmeyen bir şart yüzünden hata gösterilmez.
  return checkLimitsAndBuild(ds, autoRow, subtotal, true);
}

const TRY = (value: number) => value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export const GENERIC_CODE_ERROR = "Bu kod geçersiz veya süresi dolmuş.";
export const RATE_LIMITED_CODE_ERROR = "Çok fazla deneme yaptınız, biraz sonra tekrar deneyin.";

/** Girilen kod uygulanamadıysa müşteriye gösterilecek tek cümle; uygulandıysa / kod yoksa null. */
export function discountErrorMessage(resolution: DiscountResolution, subtotal: number): string | null {
  switch (resolution.status) {
    case "applied":
    case "none":
      return null;
    case "min_order_not_met": {
      const missing = Math.max(0, Math.round((resolution.minOrderAmount - subtotal) * 100) / 100);
      const min = resolution.minOrderAmount.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
      return `Bu kod ${min} TL ve üzeri siparişlerde geçerli. ${TRY(missing)} daha ekleyin.`;
    }
    case "usage_limit_reached":
      return "Bu kodun kullanım hakkı dolmuş.";
    case "login_required":
      return "Bu kod için giriş yapmanız gerekiyor.";
    case "rate_limited":
      return RATE_LIMITED_CODE_ERROR;
    case "invalid_code":
      return GENERIC_CODE_ERROR;
  }
}

/**
 * Faz 37 Kısım F — indirimin süresi doldu mu? Checkout (yukarıda) ve admin
 * "süresi doldu" rozeti AYNI kuralı kullanır: bitiş anı geldiyse/geçtiyse
 * geçersiz; bitiş yoksa (NULL) süresiz.
 */
/**
 * Faz 37 Kısım F — admin formundaki "Son geçerlilik tarihi" (YYYY-MM-DD) o
 * günün SONUNA (Türkiye saati, UTC+3 sabit) çevrilir. Önceden
 * `new Date("YYYY-MM-DD")` UTC gece yarısıydı → kod seçilen gün 03:00'te
 * bitiyordu (son gün fiilen geçersizdi). Boş/geçersiz → NULL (süresiz).
 */
export function discountExpiresAtFromDay(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const end = new Date(`${day}T23:59:59.999+03:00`);
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
}

export function isDiscountExpired(expiresAt: string | null, now: Date): boolean {
  return expiresAt !== null && new Date(expiresAt) <= now;
}
