import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoreSettingsForm } from "./settings-form";
import { MaintenanceForm } from "./maintenance-form";
import { ReturnSettingsCard } from "./return-settings-card";
import { StorefrontTextsCard } from "./storefront-texts-card";

export default async function StoreSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ iade?: string; vitrin?: string }>;
}) {
  const { customerId, storeId } = await params;
  const { iade, vitrin } = await searchParams;
  await requireStoreAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const { data: settings } = await supabase
    .from("store_settings")
    .select("currency, locale, tax_mode, maintenance_mode, maintenance_message")
    .eq("store_id", storeId)
    .maybeSingle();

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Store Settings</h1>
      <p className="mt-1 text-sm text-foreground/60">Para birimi, KDV ve bakım modu. Sadece store_admin+ değiştirebilir.</p>

      <div className="mt-6">
        <StoreSettingsForm
          customerId={customerId}
          storeId={storeId}
          initialValues={{
            currency: settings?.currency ?? "TRY",
            locale: settings?.locale ?? "tr-TR",
            taxMode: settings?.tax_mode ?? "excluded",
          }}
        />
      </div>

      <div className="mt-8 border-t border-black/10 pt-6">
        <h2 className="text-sm font-semibold tracking-tight">Bakım Modu</h2>
        <p className="mt-1 text-xs text-foreground/50">Kritik işlem — şifre onayı gerektirir.</p>
        <div className="mt-4">
          <MaintenanceForm
            customerId={customerId}
            storeId={storeId}
            initialValues={{
              maintenanceMode: settings?.maintenance_mode ?? false,
              maintenanceMessage: settings?.maintenance_message ?? "",
            }}
          />
        </div>
      </div>

      {/* Faz 30 — iptal/iade ayarları. */}
      <ReturnSettingsCard customerId={customerId} storeId={storeId} status={iade} />

      {/* Faz 39 — mağazaya özel vitrin metinleri (duyuru şeridi, sayfa sonu bandı, ürün rozeti). */}
      <StorefrontTextsCard customerId={customerId} storeId={storeId} status={vitrin} />
    </div>
  );
}
