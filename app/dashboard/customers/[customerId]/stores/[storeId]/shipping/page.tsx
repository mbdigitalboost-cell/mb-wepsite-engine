import { notFound } from "next/navigation";
import { ShippingFeeCard } from "./shipping-fee-card";
import Link from "next/link";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ensureShippingIntegration, getShippingIntegrationSummary } from "@/lib/integrations/store-shipping-integration";
import {
  removeShippingTokenAction,
  saveShippingTokenAction,
  testShippingConnectionAction,
  updateShippingSettingsAction,
} from "./actions";
import { ShippingSettingsForm, ShippingTestForm, ShippingTokenForm, WebhookUrlCopy } from "./shipping-forms";

/**
 * Faz 21 — "Kargo Entegrasyonu" (Basit Kargo), mağaza bazlı. Sayfanın
 * TAMAMI store_admin+ (requireStoreAdminAccess): webhook adresi secret
 * içeriyor, store_editor'ın görmesi gerekmiyor. Token burada bile
 * maskeli (son 4 hane) — tam token sadece server action'ların içinde
 * (lib/integrations/store-shipping-integration.ts) okunur.
 *
 * İlk açılışta kayıt yoksa oluşturulur (webhook secret otomatik üretilir)
 * — admin, token'ı girmeden önce bile webhook adresini Basit Kargo
 * paneline yapıştırabilsin.
 */
export default async function StoreShippingIntegrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ ucret?: string }>;
}) {
  const { customerId, storeId } = await params;
  const { ucret } = await searchParams;
  await requireStoreAdminAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, slug").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  await ensureShippingIntegration(storeId);
  const summary = await getShippingIntegrationSummary(storeId, store.slug);

  const connection =
    summary.hasToken && summary.lastTestOk === true
      ? { label: "Bağlı", variant: "success" as const }
      : summary.hasToken && summary.lastTestOk === false
        ? { label: "Hata", variant: "danger" as const }
        : summary.hasToken
          ? { label: "Test edilmedi", variant: "warning" as const }
          : { label: "Bağlı değil", variant: "outline" as const };

  const saveAction = saveShippingTokenAction.bind(null, customerId, storeId);
  const removeAction = removeShippingTokenAction.bind(null, customerId, storeId);
  const testAction = testShippingConnectionAction.bind(null, customerId, storeId);
  const settingsAction = updateShippingSettingsAction.bind(null, customerId, storeId);

  // Faz 29 — onay metninde müşteri adı.
  const { data: scopeCustomer } = await supabase.from("customers").select("name").eq("id", customerId).maybeSingle();

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Kargo Entegrasyonu</h1>
        <Badge variant={connection.variant}>{connection.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Basit Kargo (basitkargo.com) — API anahtarı mağaza bazlı saklanır, Vercel/yeniden deploy gerekmez. Sadece store_admin+
        görebilir ve değiştirebilir.
      </p>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">API Anahtarı</h2>
        <div className="mt-4">
          <ShippingTokenForm saveAction={saveAction} removeAction={removeAction} hasToken={summary.hasToken} tokenLast4={summary.tokenLast4} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Bağlantı</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Basit Kargo&apos;dan hesaba açık kargo firmalarını çeker (GET /handlers). Sonuç kaydedilir, üstteki rozet buna göre güncellenir.
        </p>
        {summary.lastTestAt ? (
          <p className="mt-2 text-xs text-foreground/60">
            Son test: {new Date(summary.lastTestAt).toLocaleString("tr-TR")} —{" "}
            <span className={summary.lastTestOk ? "text-green-700" : "text-red-600"}>{summary.lastTestMessage}</span>
          </p>
        ) : null}
        <div className="mt-4">
          <ShippingTestForm testAction={testAction} disabled={!summary.hasToken} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Webhook (Durum Senkronu)</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Bu adresi Basit Kargo paneli → Ayarlar → Webhook alanına yapıştırın (&quot;Durum Değişikliği&quot; olayı). Kargo
          durumu değişince sipariş durumu otomatik güncellenir. Adres, bu mağazaya özel bir gizli anahtar içerir — paylaşmayın.
        </p>
        <div className="mt-3">
          <WebhookUrlCopy url={summary.webhookUrl} />
        </div>
        <p className="mt-2 text-xs text-foreground/60">
          Son webhook: {summary.lastWebhookAt ? new Date(summary.lastWebhookAt).toLocaleString("tr-TR") : "henüz gelmedi"}
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Gönderim Ayarları</h2>
        <div className="mt-4">
          <ShippingSettingsForm
            settingsAction={settingsAction}
            initialValues={{
              defaultDesi: summary.defaultDesi,
              autoPushOnConfirm: summary.autoPushOnConfirm,
              isActive: summary.isActive,
            }}
          />
        </div>
      </section>

      {/* Faz 31 — kargo ücreti / ücretsiz kargo sınırı / kapıda ödeme ücreti. */}
      <ShippingFeeCard customerId={customerId} storeId={storeId} scopeLabel={`${scopeCustomer?.name ?? "?"} · ${store.name}`} status={ucret} />

      <p className="mt-6 text-xs text-foreground/50">
        Basit Kargo panelinde varsayılan bir gönderici adresi tanımlı olmalı — API çağrıları adres belirtmez, Basit Kargo
        varsayılanı kullanır.
      </p>
    </div>
  );
}
