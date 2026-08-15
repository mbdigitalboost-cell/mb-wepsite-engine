/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface InviteFormState {
  error: string | null;
  success: string | null;
}

export const initialInviteFormState: InviteFormState = { error: null, success: null };

export interface RoleFormState {
  error: string | null;
}

export const initialRoleFormState: RoleFormState = { error: null };
