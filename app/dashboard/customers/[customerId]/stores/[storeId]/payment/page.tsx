import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ensurePaymentIntegration, getPaymentIntegrationSummary } from "@/lib/integrations/store-payment-integration";
import { removePaymentKeysAction, savePaymentKeysAction, testPaymentConnectionAction, updatePaymentSettingsAction } from "./actions";
import { PaymentKeysForm, PaymentSettingsForm, PaymentTestForm, WebhookUrlCopy } from "./payment-forms";
import { BankTransferCard } from "./bank-transfer-card";

/**
 * Faz 22 — "Ödeme (iyzico)" mağaza bazlı ayar sayfası; Faz 21 Kargo
 * sayfasının deseni. TAMAMI store_admin+ (requireStoreAdminAccess).
 * Anahtarlar burada bile maskeli — tam anahtar yalnızca server action /
 * route içinde (lib/integrations/store-payment-integration.ts) okunur.
 * İlk açılışta kayıt oluşturulur (is_active=false) — anahtar yokken sayfa
 * "Bağlı değil" gösterir, hiçbir yer çökmez.
 */
export default async function StorePaymentIntegrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ havale?: string }>;
}) {
  const { customerId, storeId } = await params;
  const { havale } = await searchParams;
  await requireStoreAdminAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, slug").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  await ensurePaymentIntegration(storeId);
  const summary = await getPaymentIntegrationSummary(storeId, store.slug);
  const hasKeys = summary.hasApiKey && summary.hasSecretKey;

  const connection = !hasKeys
    ? { label: "Bağlı değil", variant: "outline" as const }
    : summary.lastTestOk === false
      ? { label: "Hata", variant: "danger" as const }
      : summary.lastTestOk === true
        ? { label: summary.isActive ? "Bağlı · Aktif" : "Bağlı · Pasif", variant: summary.isActive ? ("success" as const) : ("warning" as const) }
        : { label: "Test edilmedi", variant: "warning" as const };

  const saveAction = savePaymentKeysAction.bind(null, customerId, storeId);
  const removeAction = removePaymentKeysAction.bind(null, customerId, storeId);
  const testAction = testPaymentConnectionAction.bind(null, customerId, storeId);
  const settingsAction = updatePaymentSettingsAction.bind(null, customerId, storeId);

  return (
    <div>
      <Link href={`/dashboard/customers/${customerId}/stores/${storeId}`} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {store.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Ödeme Entegrasyonu</h1>
        <Badge variant={connection.variant}>{connection.label}</Badge>
        <Badge variant={summary.mode === "live" ? "danger" : "info"}>{summary.mode === "live" ? "CANLI MOD" : "Test modu"}</Badge>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        iyzico Ödeme Formu (Checkout Form) — kart bilgisi iyzico&apos;nun kendi sayfasında alınır, bu sunucuya hiç gelmez. Anahtarlar
        mağaza bazlı saklanır, Vercel/yeniden deploy gerekmez.
      </p>

      {summary.mode === "live" ? (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>Canlı mod açık.</strong> Vitrinden yapılan kart ödemeleri gerçek tahsilattır. Test için modu &quot;Test (sandbox)&quot; yapıp
          sandbox anahtarlarını kaydedin.
        </p>
      ) : null}

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">API Anahtarları</h2>
        <p className="mt-1 text-xs text-foreground/50">
          iyzico Merchant Panel → Ayarlar → API Anahtarları. Sandbox anahtarları sandbox.iyzipay.com panelinden alınır ve
          &quot;sandbox-&quot; ile başlar.
        </p>
        <div className="mt-4">
          <PaymentKeysForm
            saveAction={saveAction}
            removeAction={removeAction}
            hasKeys={hasKeys}
            apiKeyLast4={summary.apiKeyLast4}
            secretKeyLast4={summary.secretKeyLast4}
            currentMode={summary.mode}
          />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Bağlantı</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Kayıtlı anahtar ve modla iyzico&apos;ya kimlik doğrulamalı, para hareketi olmayan bir istek atar (BIN sorgusu). Yanlış anahtar ya da
          yanlış mod burada görünür.
        </p>
        {summary.lastTestAt ? (
          <p className="mt-2 text-xs text-foreground/60">
            Son test: {new Date(summary.lastTestAt).toLocaleString("tr-TR")} —{" "}
            <span className={summary.lastTestOk ? "text-green-700" : "text-red-600"}>{summary.lastTestMessage}</span>
          </p>
        ) : null}
        <div className="mt-4">
          <PaymentTestForm testAction={testAction} disabled={!hasKeys} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Webhook (Ödeme Bildirimi)</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Bu adresi iyzico Merchant Panel → Ayarlar → Firma Ayarları → İşyeri Bildirimleri alanına yapıştırın. Müşteri ödeme sonrası
          sekmeyi kapatsa bile sipariş &quot;ödendi&quot; olur. Bildirim imzası (X-IYZ-SIGNATURE-V3) hesabınızda açıksa doğrulanır; her
          durumda sonuç iyzico&apos;dan ayrıca sorgulanır.
        </p>
        <div className="mt-3">
          <WebhookUrlCopy url={summary.webhookUrl} />
        </div>
        <p className="mt-2 text-xs text-foreground/60">
          Son webhook: {summary.lastWebhookAt ? new Date(summary.lastWebhookAt).toLocaleString("tr-TR") : "henüz gelmedi"}
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Ayarlar</h2>
        <div className="mt-4">
          <PaymentSettingsForm settingsAction={settingsAction} initialValues={{ mode: summary.mode, isActive: summary.isActive }} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 bg-black/[0.02] p-5 text-xs text-foreground/60">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Notlar</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            İade / iptal bu panelden yapılmaz: iyzico panelinden iade edin, ardından sipariş detayında ödeme durumunu elle &quot;İade
            Edildi&quot; yapın.
          </li>
          <li>Kart seçilmiş ama ödenmemiş siparişler Siparişler sayfasında &quot;Ödeme bekleyen kart siparişleri&quot; filtresiyle listelenir.</li>
          <li>Sandbox test kartları: docs.iyzico.com → Test Kartları (sandbox ortamında gerçek kart çalışmaz).</li>
        </ul>
      </section>

      {/* Faz 40 (ek) — Havale/EFT bilgileri; yalnız Havale siparişinin müşterisine, sipariş sonrası gösterilir. */}
      <BankTransferCard customerId={customerId} storeId={storeId} status={havale} />
    </div>
  );
}
