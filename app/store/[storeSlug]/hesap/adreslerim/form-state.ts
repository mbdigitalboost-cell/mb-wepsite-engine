/** See app/store/[storeSlug]/hesap/form-state.ts for why this lives outside actions.ts. */
export interface AddressFormState {
  status: "idle" | "error";
  error: string | null;
}

export const initialAddressFormState: AddressFormState = { status: "idle", error: null };
