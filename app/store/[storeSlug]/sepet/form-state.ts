export interface CheckoutFormState {
  status: "idle" | "error" | "success";
  error: string | null;
  orderNumber: number | null;
}

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  error: null,
  orderNumber: null,
};
