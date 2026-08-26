import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoreBrandingForm } from "./branding-form";

export default async function StoreBrandingPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const { data: branding } = await supabase
    .from("store_branding")
    .select("primary_color, secondary_color, accent_color, button_style, typography, color_mode, theme_config")
    .eq("store_id", storeId)
    .maybeSingle();

  const themeConfig = (branding?.theme_config as Record<string, string>) ?? {};

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Branding</h1>
      <p className="mt-1 text-sm text-foreground/60">Renk/tema token&apos;ları. store_editor+ değiştirebilir.</p>

      <div className="mt-6">
        <StoreBrandingForm
          customerId={customerId}
          storeId={storeId}
          initialValues={{
            primaryColor: branding?.primary_color ?? "",
            secondaryColor: branding?.secondary_color ?? "",
            accentColor: branding?.accent_color ?? "",
            buttonStyle: branding?.button_style ?? "",
            typography: branding?.typography ?? "",
            colorMode: branding?.color_mode ?? "light",
            themeConfig: { hoverColor: themeConfig.hoverColor ?? "" },
          }}
        />
      </div>
    </div>
  );
}
