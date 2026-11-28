import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingSubmitButton } from "@/components/dashboard/pending-submit-button";
import { MIN_RETURN_WINDOW_DAYS } from "@/lib/commerce/returns/eligibility";
import { updateReturnSettingsAction } from "./return-settings-actions";

const inputClasses = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

/** Faz 30 — "İade ayarları" kartı (mağaza Ayarlar sayfası). Kaydetme store_admin+. */
export async function ReturnSettingsCard({ customerId, storeId, status }: { customerId: string; storeId: string; status?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_return_settings").select("*").eq("store_id", storeId).maybeSingle();

  return (
    <div className="mt-8 border-t border-black/10 pt-6" id="iade-ayarlari">
      <h2 className="text-sm font-semibold tracking-tight">İade ayarları</h2>
      <p className="mt-1 max-w-2xl text-xs text-foreground/60">
        Açıkken müşteriler Siparişlerim sayfasından iptal (kargodan önce) ve iade talebi oluşturabilir; talepler Siparişler → İptal &amp; İade
        sekmesine düşer. Cayma süresi teslimden başlar ve {MIN_RETURN_WINDOW_DAYS} günden kısa olamaz. Yasal metinleri hukuki danışmanınıza teyit
        ettirin.
      </p>
      {status === "kaydedildi" ? <p className="mt-3 text-sm text-green-700">İade ayarları kaydedildi.</p> : null}
      {status === "hata" ? <p className="mt-3 text-sm text-red-700">Kaydedilemedi; alanları kontrol edin (iade süresi en az {MIN_RETURN_WINDOW_DAYS} gün).</p> : null}

      <form action={updateReturnSettingsAction.bind(null, customerId, storeId)} className="mt-4 grid max-w-2xl gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="returnsEnabled" defaultChecked={data?.returns_enabled ?? false} className="h-4 w-4" />
          Sitede iptal/iade talebi açık
        </label>
        <label className="text-sm">
          İade süresi (gün, teslimden itibaren)
          <input
            type="number"
            name="returnWindowDays"
            min={MIN_RETURN_WINDOW_DAYS}
            max={365}
            required
            defaultValue={data?.return_window_days ?? 14}
            className={inputClasses}
          />
        </label>
        <label className="text-sm">
          İade kargo firması (anlaşmalı)
          <input name="carrierName" maxLength={120} defaultValue={data?.return_carrier_name ?? ""} className={inputClasses} />
        </label>
        <label className="text-sm">
          İade / anlaşma kodu
          <input name="returnCode" maxLength={120} defaultValue={data?.return_code ?? ""} className={inputClasses} />
        </label>
        <label className="text-sm">
          Müşteriye gösterilecek iade talimatı
          <textarea name="instructions" rows={4} maxLength={4000} defaultValue={data?.return_instructions ?? ""} className={inputClasses} />
        </label>
        <label className="text-sm">
          İade adresi (gerekiyorsa)
          <textarea name="address" rows={2} maxLength={1000} defaultValue={data?.return_address ?? ""} className={inputClasses} />
        </label>
        <div>
          <PendingSubmitButton label="İade ayarlarını kaydet" className="h-9 rounded-md bg-brand-accent px-4 text-sm font-medium text-white hover:opacity-90" />
        </div>
      </form>
    </div>
  );
}
