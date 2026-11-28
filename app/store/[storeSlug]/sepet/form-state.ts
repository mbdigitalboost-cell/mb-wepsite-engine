import type { BankTransferDetails } from "@/lib/commerce/payments/bank-transfer";

export interface CheckoutFormState {
  status: "idle" | "error" | "success";
  error: string | null;
  orderNumber: number | null;
  /** "Aboneler" indirim sistemi — server-resolved, sadece status="success" iken dolu. */
  discountAmount: number | null;
  discountCode: string | null;
  /**
   * Faz 22 — kart ödemesi seçildiyse sipariş oluşturuldu ama HENÜZ ödenmedi:
   * client bu adrese (mağaza içi /odeme/[orderId] sayfası) yönlendirir,
   * sepeti BOŞALTMAZ. Diğer yöntemlerde null (eski davranış aynen).
   */
  paymentRedirectUrl: string | null;
  /** Faz 31 — sunucunun hesapladığı kargo ve kapıda ödeme ücreti ile toplam (yalnız başarıda). */
  shippingFee?: number | null;
  codFee?: number | null;
  total?: number | null;
  /** Faz 32 — ekrandaki toplam sunucununkiyle uyuşmadı; sipariş oluşmadı, özet yenilenmeli. */
  totalChanged?: boolean;
  newTotal?: number | null;
  /** Faz 33 — kabul edilen sözleşme anlık görüntüsünün adresi (misafirde imzalı jetonlu). */
  contractUrl?: string | null;
  /** Faz 35 — sipariş kimliği (Purchase olayının transaction_id/eventID'si; kişisel veri değil). */
  orderId?: string | null;
  /** Faz 40 (ek) — Havale/EFT siparişinde mağazanın hesap bilgileri; yoksa null. */
  bankTransfer?: BankTransferDetails | null;
}

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  error: null,
  orderNumber: null,
  discountAmount: null,
  discountCode: null,
  paymentRedirectUrl: null,
};
