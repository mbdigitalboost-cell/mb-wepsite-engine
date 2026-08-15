/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface WebsiteFormState {
  error: string | null;
}

export const initialWebsiteFormState: WebsiteFormState = { error: null };
