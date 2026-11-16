import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "../returns/confirm-submit-button";
import { updateShippingFeeSettingsAction } from "./shipping-fee-actions";

const inputClasses =
  "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

/**
 * Faz 31 — "Kargo ücreti" kartı (Mağaza → Kargo). Kayıt yoksa form
 * varsayılanlarla dolu gelir ama kaydedilene kadar vitrinde ücret ALINMAZ
 * (lib/commerce/shipping-fee.ts NO_SHIPPING_FEE_SETTINGS).
 */
export async function ShippingFeeCard({
  customerId,
  storeId,
  scopeLabel,
  status,
}: {
  customerId: string;
  storeId: string;
  scopeLabel: string;
  status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_shipping_fee_settings").select("*").eq("store_id", storeId).maybeSingle();

  return (
    <section id="kargo-ucreti" className="mt-8 rounded-lg border border-black/10 p-4">
      <h2 className="text-sm font-semibold tracking-tight">Kargo ücreti</h2>
      <p className="mt-1 max-w-2xl text-xs text-foreground/60">
        Sepette, ödeme ekranında ve siparişte kullanılır; tutar sipariş anında sunucuda hesaplanıp siparişe kaydedilir (geçmiş siparişler
        değişmez). Duyuru şeridi ve ürün sayfasındaki &quot;ücretsiz kargo&quot; metni de buradan gelir.
        {data ? null : " Henüz kaydedilmedi — kaydedilene kadar vitrinde kargo ücreti alınmaz."}
      </p>
      {status === "kaydedildi" ? <p className="mt-3 text-sm text-green-700">Kargo ücreti ayarı kaydedildi.</p> : null}
      {status === "hata" ? <p className="mt-3 text-sm text-red-700">Kaydedilemedi; tutarları kontrol edin (negatif olamaz).</p> : null}

      <form action={updateShippingFeeSettingsAction.bind(null, customerId, storeId)} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Kargo ücreti (TL)
          <input name="shippingFee" inputMode="decimal" required defaultValue={data ? String(data.shipping_fee) : "250"} className={inputClasses} />
        </label>
        <label className="text-sm">
          Ücretsiz kargo sınırı (TL)
          <input
            name="freeShippingThreshold"
            inputMode="decimal"
            defaultValue={data ? (data.free_shipping_threshold === null ? "" : String(data.free_shipping_threshold)) : "2000"}
            placeholder="Boş = ücretsiz kargo yok"
            className={inputClasses}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Sınır neye göre hesaplanır?
          <select name="thresholdBasis" defaultValue={data?.threshold_basis ?? "before_discount"} className={inputClasses}>
            <option value="before_discount">İndirim öncesi ürün tutarı (indirim kodu kargoyu etkilemez)</option>
            <option value="after_discount">İndirim sonrası ürün tutarı</option>
          </select>
        </label>
        <label className="text-sm">
          Kapıda ödeme ek ücreti (TL)
          <input name="codFee" inputMode="decimal" defaultValue={data ? String(data.cod_fee) : "0"} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">0 ise müşteriye satır gösterilmez.</span>
        </label>
        <div className="flex items-end sm:col-span-2">
          <ConfirmSubmitButton
            label="Kargo ücretini kaydet"
            confirmText={`${scopeLabel}\n\nKargo ücreti ayarı değiştirilsin mi? Yeni siparişler bu ayarla hesaplanır.`}
          />
        </div>
      </form>
    </section>
  );
}
