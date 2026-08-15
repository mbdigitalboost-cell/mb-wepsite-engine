"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server Action for the dashboard's "Çıkış Yap" (sign out) control. Ends
 * the Supabase session (clears the auth cookies) and sends the user back
 * to /login. Used directly as a <form action={signOutAction}> — no
 * client-side JS needed for this to work.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
