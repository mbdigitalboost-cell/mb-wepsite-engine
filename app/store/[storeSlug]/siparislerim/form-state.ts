import type { PublicOrderWithItems } from "@/lib/commerce/public/order-lookup";

export interface GuestOrderLookupState {
  status: "idle" | "error" | "success";
  /** Her zaman TEK VE AYNI genel mesaj ("Sipariş bulunamadı, bilgileri kontrol edin.") — bkz. actions.ts'in kendi doc comment'i. */
  error: string | null;
  order: PublicOrderWithItems | null;
}

export const initialGuestOrderLookupState: GuestOrderLookupState = {
  status: "idle",
  error: null,
  order: null,
};
