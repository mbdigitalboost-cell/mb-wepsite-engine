"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { LoginState } from "./form-state";

/**
 * Server Action backing the login form (bound via React's
 * `useActionState`). Server-side is the ONLY place this is validated —
 * there is no client-side auth check anywhere that matters for security,
 * only for instant form feedback.
 *
 * Deliberately returns a generic "e-posta veya şifre hatalı" message for
 * every failure case (wrong password, unknown email, etc.) rather than
 * Supabase's raw error — telling an attacker "that email doesn't exist"
 * vs. "wrong password" is an account-enumeration leak.
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli." };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase henüz bağlanmadı. Platform Supabase projesi kurulup .env.local doldurulduğunda giriş aktif olacak.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-posta veya şifre hatalı." };
  }

  redirect("/dashboard");
}
