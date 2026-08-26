/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface StoreFormState {
  error: string | null;
}

export const initialStoreFormState: StoreFormState = { error: null };
