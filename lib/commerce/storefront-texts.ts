/**
 * Faz 39 Adım 2.2–2.3 — MAĞAZAYA ÖZEL VİTRİN METİNLERİ (saf mantık; import yok).
 *
 * Önceden ortak mağaza motoru tek bir mağazanın metinlerini sabit kodluyordu
 * (duyuru şeridi maddesi, CTA bandı cümleleri, "kendi üretim" rozeti).
 * Artık her mağazanın metni veritabanında, `store_storefront_texts`
 * satırında durur ve admin panelden (Mağaza → Ayarlar → Vitrin metinleri)
 * düzenlenir.
 *
 * KURAL — uydurma varsayılan YOK: bir alan boşsa o parça HİÇ gösterilmez.
 * Satırı olmayan (yeni) mağazada şerit yalnız ayarlardan türeyen iddiaları
 * (ücretsiz kargo, iade) gösterir; CTA bandı ve rozet görünmez.
 */

export const ANNOUNCEMENT_MAX_ITEMS = 6;
export const ANNOUNCEMENT_ITEM_MAX_LENGTH = 80;
export const STOREFRONT_TEXT_MAX_LENGTH = 200;

export interface StorefrontTexts {
  /** Duyuru şeridinin mağazaya özel maddeleri (sırayla). */
  announcementItems: string[];
  /** Sayfa sonu CTA bandı. Başlık boşsa bant gösterilmez. */
  ctaBandTitle: string | null;
  ctaBandSubtitle: string | null;
  /** Ürün sayfasındaki "kendi üretim" rozeti. Başlık boşsa rozet gösterilmez. */
  ownProductionTitle: string | null;
  ownProductionSubtitle: string | null;
}

export const EMPTY_STOREFRONT_TEXTS: StorefrontTexts = {
  announcementItems: [],
  ctaBandTitle: null,
  ctaBandSubtitle: null,
  ownProductionTitle: null,
  ownProductionSubtitle: null,
};

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Veritabanı satırı → güvenli değer (boş/bozuk alanlar "yok" sayılır). */
export function toStorefrontTexts(
  row: {
    announcement_items?: unknown;
    cta_band_title?: unknown;
    cta_band_subtitle?: unknown;
    own_production_title?: unknown;
    own_production_subtitle?: unknown;
  } | null,
): StorefrontTexts {
  if (!row) return EMPTY_STOREFRONT_TEXTS;
  const items = Array.isArray(row.announcement_items) ? row.announcement_items.map(clean).filter((item): item is string => item !== null) : [];
  return {
    announcementItems: items.slice(0, ANNOUNCEMENT_MAX_ITEMS),
    ctaBandTitle: clean(row.cta_band_title),
    ctaBandSubtitle: clean(row.cta_band_subtitle),
    ownProductionTitle: clean(row.own_production_title),
    ownProductionSubtitle: clean(row.own_production_subtitle),
  };
}

/**
 * Duyuru şeridinin maddeleri, sırayla: ücretsiz kargo iddiası (kargo ayarından),
 * iade iddiası (iade açıksa), sonra mağazanın kendi maddeleri. Yinelenen madde
 * bir kez gösterilir. Hepsi boşsa şerit hiç gösterilmez (boş dizi).
 */
export function announcementBarItems(input: { freeShippingClaim: string | null; returnsClaim: string | null; storeItems: readonly string[] }): string[] {
  const items = [input.freeShippingClaim, input.returnsClaim, ...input.storeItems].filter((item): item is string => Boolean(item && item.trim()));
  return [...new Set(items)];
}

export interface OwnProductionBadge {
  title: string;
  subtitle: string | null;
}

export function ownProductionBadge(texts: StorefrontTexts): OwnProductionBadge | null {
  return texts.ownProductionTitle ? { title: texts.ownProductionTitle, subtitle: texts.ownProductionSubtitle } : null;
}

/** Admin formundaki "her satıra bir madde" metni → madde listesi. */
export function parseAnnouncementLines(text: string): string[] {
  return [...new Set(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

/** Admin girdisinin doğrulaması; hata yoksa null. */
export function validateStorefrontTexts(texts: StorefrontTexts): string | null {
  if (texts.announcementItems.length > ANNOUNCEMENT_MAX_ITEMS) return `Duyuru şeridine en fazla ${ANNOUNCEMENT_MAX_ITEMS} madde yazılabilir.`;
  if (texts.announcementItems.some((item) => item.length > ANNOUNCEMENT_ITEM_MAX_LENGTH)) {
    return `Duyuru şeridi maddesi en fazla ${ANNOUNCEMENT_ITEM_MAX_LENGTH} karakter olabilir.`;
  }
  const fields = [texts.ctaBandTitle, texts.ctaBandSubtitle, texts.ownProductionTitle, texts.ownProductionSubtitle];
  if (fields.some((field) => field !== null && field.length > STOREFRONT_TEXT_MAX_LENGTH)) {
    return `Metin alanları en fazla ${STOREFRONT_TEXT_MAX_LENGTH} karakter olabilir.`;
  }
  if (!texts.ctaBandTitle && texts.ctaBandSubtitle) return "CTA bandının alt metni için önce başlık yazın (başlık boşsa bant gösterilmez).";
  if (!texts.ownProductionTitle && texts.ownProductionSubtitle) return "Rozet alt metni için önce rozet başlığı yazın (başlık boşsa rozet gösterilmez).";
  return null;
}
