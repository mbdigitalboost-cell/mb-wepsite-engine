import { CheckCircle2, Truck } from "lucide-react";
import { freeShippingProgress, type ShippingFeeSettings } from "@/lib/commerce/shipping-fee";
import { formatPrice } from "@/lib/utils/format-price";

/**
 * Faz 34 — "Ücretsiz kargoya ₺X kaldı" + dolum çubuğu (sepet üstü ve sepete
 * ekleme sonrası). Hesap lib/commerce/shipping-fee.ts freeShippingProgress
 * (Faz 31 kuralı, ayar sunucudan). Sınır yoksa hiçbir şey render etmez.
 * Sahte aciliyet yok: yalnız gerçek kalan tutar.
 */
export function FreeShippingProgress({ itemsTotal, settings, className = "" }: { itemsTotal: number; settings: ShippingFeeSettings; className?: string }) {
  const progress = freeShippingProgress(itemsTotal, settings);
  if (!progress.show || itemsTotal <= 0) return null;

  return (
    <div className={`rounded-[12px] border border-[#292929] bg-[#171717] p-3 ${className}`} aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-[#F5F5F5]">
        {progress.reached ? (
          <>
            <CheckCircle2 size={16} className="shrink-0 text-[#3FA34D]" aria-hidden="true" />
            Kargonuz ücretsiz
          </>
        ) : (
          <>
            <Truck size={16} className="shrink-0 text-[#D95F00]" aria-hidden="true" />
            Ücretsiz kargoya <strong className="font-semibold">{formatPrice(progress.remaining)}</strong> kaldı
          </>
        )}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#292929]"
        role="progressbar"
        aria-label="Ücretsiz kargo sınırına ilerleme"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
      >
        <div className={`h-full rounded-full ${progress.reached ? "bg-[#3FA34D]" : "bg-[#D95F00]"}`} style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
      </div>
    </div>
  );
}
