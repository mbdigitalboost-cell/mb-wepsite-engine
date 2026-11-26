/**
 * Faz 37 Kısım B — boş taslak ürünler (saf; tests/draft-products.test.ts).
 * "Yeni Ürün" her tıklamada yeni bir taslak satırı açıyordu (2026-11-23'te
 * 3 saniyede 3 taslak). Bir taslak, oluşturulduktan sonra satırı hiç
 * düzenlenmemişse ve kendisine bağlı hiçbir şey eklenmemişse (görsel,
 * seçenek/varyant, ek ürün, kategori, sipariş) "boş" sayılır.
 */
export const DRAFT_PRODUCT_NAME = "Yeni ürün";
/** Aynı kullanıcının bu süre içinde açtığı boş taslağa yeniden yönlendirilir. */
export const DRAFT_REUSE_WINDOW_MS = 30 * 60 * 1000;
/** Oluşturma ile son güncelleme arasındaki bu kadar fark "dokunulmamış" sayılır (aynı istek içindeki tetikleyiciler). */
const UNTOUCHED_TOLERANCE_MS = 5_000;

export interface DraftCandidate {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  price: number;
  shortDescription: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  /** Bağlı kayıt sayısı: görsel + varyant + seçenek grubu + ek ürün + kategori bağı + sipariş kalemi. */
  linkedCount: number;
}

export function isUntouchedDraft(row: DraftCandidate): boolean {
  if (row.isActive || row.name !== DRAFT_PRODUCT_NAME || !row.slug.startsWith("taslak-")) return false;
  if (Number(row.price) !== 0 || (row.shortDescription ?? "").trim() || (row.description ?? "").trim()) return false;
  if (row.linkedCount > 0) return false;
  return Math.abs(new Date(row.updatedAt).getTime() - new Date(row.createdAt).getTime()) <= UNTOUCHED_TOLERANCE_MS;
}

/** Kullanıcının pencere içindeki en yeni boş taslağı (yoksa null) — yenisini açmak yerine ona gidilir. */
export function findReusableDraft(rows: readonly DraftCandidate[], ownDraftIds: ReadonlySet<string>, now: Date = new Date()): DraftCandidate | null {
  const since = now.getTime() - DRAFT_REUSE_WINDOW_MS;
  return (
    rows
      .filter((row) => ownDraftIds.has(row.id) && new Date(row.createdAt).getTime() >= since && isUntouchedDraft(row))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}
