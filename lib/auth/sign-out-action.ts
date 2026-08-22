"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";

/**
 * Server Action for the dashboard's "Çıkış Yap" (sign out) control. Ends
 * the Supabase session (clears the auth cookies) and sends the user back
 * to /login. Used directly as a <form action={signOutAction}> — no
 * client-side JS needed for this to work.
 *
 * Phase 1 (PHASE_0 audit, denetim kapsamının genişletilmesi): kullanıcı
 * bilgisi `signOut()` çağrısından ÖNCE okunuyor — sonrasında oturum zaten
 * temizlenmiş oluyor ve `getUser()` null döner, log satırı kimliksiz
 * kalırdı.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  if (user) {
    await logAuditEvent({
      userId: user.id,
      customerId: null,
      action: "auth.logout",
      entityType: "auth",
      entityId: user.id,
    });
  }

  redirect("/login");
}
