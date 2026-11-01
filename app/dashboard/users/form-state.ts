/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface CreateUserFormState {
  error: string | null;
  /** Admin Kullanıcı Oluşturma devir metni — tek seferlik geçici şifre gösterimi (bkz. temp-password-reveal.tsx). Hiçbir yerde kalıcı saklanmıyor, sadece bu form state'inde, tek render için. */
  success: { email: string; tempPassword: string } | null;
}

export const initialCreateUserFormState: CreateUserFormState = { error: null, success: null };

export interface RoleFormState {
  error: string | null;
}

export const initialRoleFormState: RoleFormState = { error: null };

export interface ResetPasswordFormState {
  error: string | null;
  success: { email: string; tempPassword: string } | null;
}

export const initialResetPasswordFormState: ResetPasswordFormState = { error: null, success: null };
