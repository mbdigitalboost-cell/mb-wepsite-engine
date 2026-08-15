"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setPasswordFormSchema } from "@/lib/validation/invite";
import type { SetPasswordState } from "./form-state";

/**
 * Lets the CURRENT session set its own password — works for a freshly
 * invited user (landed here via /auth/callback?next=/auth/set-password
 * right after accepting an invite) and for anyone else who wants to
 * change their password later from /dashboard/settings. Either way this
 * only ever touches the caller's own account: `supabase.auth.updateUser`
 * operates on the session's own user, there is no user-id parameter here
 * for an admin (or anyone else) to point at someone else's account —
 * matching the spec's "Admin hiçbir zaman müşterinin şifresini görmemeli
 * veya belirlememeli."
 */
export async function setPasswordAction(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  await requireSession();

  const parsed = setPasswordFormSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: `Şifre belirlenemedi: ${error.message}` };
  }

  redirect("/dashboard");
}
