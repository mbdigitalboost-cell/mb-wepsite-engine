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
}

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  error: null,
  orderNumber: null,
  discountAmount: null,
  discountCode: null,
  paymentRedirectUrl: null,
};
