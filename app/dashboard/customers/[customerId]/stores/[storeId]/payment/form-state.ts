/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface PaymentFormState {
  error: string | null;
  success: string | null;
}

export const initialPaymentFormState: PaymentFormState = { error: null, success: null };
