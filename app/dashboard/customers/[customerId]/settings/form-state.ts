/** See app/dashboard/customers/form-state.ts (Phase 4) for why this lives outside the "use server" actions.ts. */
export interface SiteSettingsFormState {
  error: string | null;
}

export const initialSiteSettingsFormState: SiteSettingsFormState = { error: null };
