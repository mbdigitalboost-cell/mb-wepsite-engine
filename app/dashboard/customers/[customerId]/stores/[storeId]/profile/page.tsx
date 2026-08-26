import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoreProfileForm } from "./profile-form";

/**
 * Read gate is `requireStoreAccess` (store_viewer+) — every store member
 * can SEE this page and the form, matching the existing content-module
 * convention (see content/hero/page.tsx). The write gate
 * (`requireStoreAdminAccess`) lives ONLY in actions.ts and is what
 * actually decides whether a submit succeeds — a store_editor/viewer
 * submitting this form gets `notFound()` from the action itself.
 */
export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const { data: profile } = await supabase
    .from("store_profiles")
    .select("display_name, description, logo_url, favicon_url, phone, email, address, social_links, business_info")
    .eq("store_id", storeId)
    .maybeSingle();

  const socialLinks = (profile?.social_links as Record<string, string>) ?? {};
  const businessInfo = (profile?.business_info as Record<string, string>) ?? {};

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Store Profile</h1>
      <p className="mt-1 text-sm text-foreground/60">Kimlik, iletişim ve sosyal medya bilgisi. Sadece store_admin+ değiştirebilir.</p>

      <div className="mt-6">
        <StoreProfileForm
          customerId={customerId}
          storeId={storeId}
          initialValues={{
            displayName: profile?.display_name ?? "",
            description: profile?.description ?? "",
            logoUrl: profile?.logo_url ?? "",
            faviconUrl: profile?.favicon_url ?? "",
            phone: profile?.phone ?? "",
            email: profile?.email ?? "",
            address: profile?.address ?? "",
            socialLinks: {
              instagram: socialLinks.instagram ?? "",
              facebook: socialLinks.facebook ?? "",
              whatsapp: socialLinks.whatsapp ?? "",
              tiktok: socialLinks.tiktok ?? "",
              youtube: socialLinks.youtube ?? "",
              linkedin: socialLinks.linkedin ?? "",
            },
            businessInfo: {
              tradeName: businessInfo.tradeName ?? "",
              taxOffice: businessInfo.taxOffice ?? "",
              taxNumber: businessInfo.taxNumber ?? "",
              mersisNumber: businessInfo.mersisNumber ?? "",
            },
          }}
        />
      </div>
    </div>
  );
}
