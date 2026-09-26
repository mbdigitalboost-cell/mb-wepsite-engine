"use server";

import { redirect } from "next/navigation";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { setPasswordFormSchema } from "@/lib/validation/invite";
import type { UpdatePasswordState } from "./form-state";

/**
 * Storefront analogue of app/auth/set-password/actions.ts's
 * setPasswordAction — same `supabase.auth.updateUser({ password })` call
 * (reuses the same setPasswordFormSchema, min 8 + confirm-match), but
 * gates on a plain session check (redirect to THIS store's own /giris, not
 * the dashboard's /login) and redirects back to THIS store's /hesap on
 * success, not /dashboard. Not a copy-paste-and-diverge risk: the
 * dashboard's own set-password page/action is untouched.
 */
export async function updatePasswordAction(
  storeSlug: string,
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/store/${storeSlug}/hesap/giris`);
  }

  const parsed = setPasswordFormSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: `Şifre güncellenemedi: ${error.message}` };
  }

  redirect(`/store/${storeSlug}/hesap`);
}
