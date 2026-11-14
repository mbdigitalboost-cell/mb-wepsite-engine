import { publicEnv } from "@/lib/config/env";
import { buildStoreHref, storeBaseFor } from "@/lib/sites/store-paths";

/**
 * Faz 29 Kısım B — mağaza linkleri için TEK yardımcı (sunucu + istemci).
 * `publicEnv.cleanStoreSlug` build'de gömülür (next.config.ts), bu yüzden
 * istemci bileşenleri de sunucuyla aynı adresi üretir.
 *
 *   storeHref("taktikalp46")                → "/"            (t46store.com)
 *   storeHref("taktikalp46", "/urun/x")     → "/urun/x"
 *   storeBase("taktikalp46") + "/sepet"     → "/sepet"
 *   başka bir mağaza / temiz adressiz deploy → "/store/<slug>/..."
 *
 * Mutlak adres gerekiyorsa (e-posta, iyzico dönüşü): origin + storeHref(...).
 */
export function storeHref(storeSlug: string, path = ""): string {
  return buildStoreHref(publicEnv.cleanStoreSlug, storeSlug, path);
}

/** Şablon içinde birleştirmek için önek ("" ya da "/store/<slug>"). Tek başına href olarak kullanmayın — ana sayfa için storeHref(slug). */
export function storeBase(storeSlug: string): string {
  return storeBaseFor(publicEnv.cleanStoreSlug, storeSlug);
}
