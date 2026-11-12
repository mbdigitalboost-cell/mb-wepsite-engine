/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface ShippingFormState {
  error: string | null;
  success: string | null;
  /** "Bağlantıyı Test Et" başarılıysa hesaba açık firmalar — token asla burada değil. */
  handlers: Array<{ code: string; name: string }> | null;
}

export const initialShippingFormState: ShippingFormState = { error: null, success: null, handlers: null };
