export interface CheckoutFormState {
  status: "idle" | "error" | "success";
  error: string | null;
  orderNumber: number | null;
  /** "Aboneler" indirim sistemi — server-resolved, sadece status="success" iken dolu. */
  discountAmount: number | null;
  discountCode: string | null;
}

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  error: null,
  orderNumber: null,
  discountAmount: null,
  discountCode: null,
};
