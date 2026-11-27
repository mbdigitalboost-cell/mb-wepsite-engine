import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ANNOUNCEMENT_ITEM_MAX_LENGTH, ANNOUNCEMENT_MAX_ITEMS, STOREFRONT_TEXT_MAX_LENGTH, toStorefrontTexts } from "@/lib/commerce/storefront-texts";
import { updateStorefrontTextsAction } from "./storefront-texts-actions";

const inputClasses = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

/**
 * Faz 39 — Mağaza → Ayarlar → "Vitrin metinleri". Bu metinler önceden kodda
 * sabitti; artık mağaza başına veritabanında. Boş bırakılan parça vitrinde
 * hiç görünmez (uydurma varsayılan yok). Kaydetme yalnız store_admin+.
 */
export async function StorefrontTextsCard({ customerId, storeId, status }: { customerId: string; storeId: string; status?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_storefront_texts")
    .select("announcement_items, cta_band_title, cta_band_subtitle, own_production_title, own_production_subtitle")
    .eq("store_id", storeId)
    .maybeSingle();
  const texts = toStorefrontTexts(data);

  return (
    <div className="mt-8 border-t border-black/10 pt-6" id="vitrin-metinleri">
      <h2 className="text-sm font-semibold tracking-tight">Vitrin metinleri</h2>
      <p className="mt-1 max-w-2xl text-xs text-foreground/60">
        Mağazanızın sitesinde görünen kısa metinler. Boş bıraktığınız parça sitede hiç gösterilmez. Yazdığınız ifadeler müşteriye verilen
        birer beyandır; yalnızca doğru olanları yazın.
      </p>
      {status === "kaydedildi" ? <p className="mt-3 text-sm text-green-700">Vitrin metinleri kaydedildi.</p> : null}
      {status === "hata" ? (
        <p className="mt-3 text-sm text-red-700">
          Kaydedilemedi. En fazla {ANNOUNCEMENT_MAX_ITEMS} şerit maddesi ({ANNOUNCEMENT_ITEM_MAX_LENGTH} karakter), diğer alanlar en fazla{" "}
          {STOREFRONT_TEXT_MAX_LENGTH} karakter olabilir; alt metin için önce başlık yazılmalıdır.
        </p>
      ) : null}

      <form action={updateStorefrontTextsAction.bind(null, customerId, storeId)} className="mt-4 grid max-w-2xl gap-4">
        <label className="text-sm">
          Duyuru şeridi maddeleri (her satıra bir madde)
          <textarea name="announcementItems" rows={4} defaultValue={texts.announcementItems.join("\n")} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">
            Sitenin en üstündeki ince şerit. Ücretsiz kargo ve iade maddeleri kargo/iade ayarlarınızdan otomatik eklenir; buraya yazmayın.
          </span>
        </label>
        <label className="text-sm">
          Sayfa sonu bandı — başlık
          <input name="ctaBandTitle" maxLength={STOREFRONT_TEXT_MAX_LENGTH} defaultValue={texts.ctaBandTitle ?? ""} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">Ürün ve marka sayfalarının altındaki renkli bant. Başlık boşsa bant gösterilmez.</span>
        </label>
        <label className="text-sm">
          Sayfa sonu bandı — alt metin
          <input name="ctaBandSubtitle" maxLength={STOREFRONT_TEXT_MAX_LENGTH} defaultValue={texts.ctaBandSubtitle ?? ""} className={inputClasses} />
        </label>
        <label className="text-sm">
          Ürün sayfası rozeti — başlık
          <input name="ownProductionTitle" maxLength={STOREFRONT_TEXT_MAX_LENGTH} defaultValue={texts.ownProductionTitle ?? ""} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">
            Ürün görselinin üstündeki rozet ve fiyatın altındaki güven kutusu. Başlık boşsa ikisi de gösterilmez.
          </span>
        </label>
        <label className="text-sm">
          Ürün sayfası rozeti — alt metin
          <input name="ownProductionSubtitle" maxLength={STOREFRONT_TEXT_MAX_LENGTH} defaultValue={texts.ownProductionSubtitle ?? ""} className={inputClasses} />
        </label>
        <div>
          <button type="submit" className="h-9 rounded-md bg-brand-accent px-4 text-sm font-medium text-white hover:opacity-90">
            Vitrin metinlerini kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
