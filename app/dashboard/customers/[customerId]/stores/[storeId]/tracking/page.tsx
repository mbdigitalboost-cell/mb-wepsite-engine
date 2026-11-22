import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "../returns/confirm-submit-button";
import { activeTools, NO_TRACKING, type StoreTrackingSettings } from "@/lib/tracking/store-tracking";
import { updateTrackingSettingsAction } from "./actions";

const inputClasses =
  "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 font-mono text-sm focus-visible:border-brand-accent focus-visible:outline-none";

/** Sunucu bileşeni her istekte render edilir; özet penceresi istek anına göre. */
function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

const ACTION_LABELS: Record<string, string> = { accept_all: "Tümünü kabul", reject_all: "Tümünü ret", custom: "Özel seçim", withdraw: "İzni geri alma" };

/**
 * Faz 35 — Mağaza → Takip ve Reklam. store_admin+ (Faz 29 guard). Kimlikler
 * mağaza başına (platform env'leri vitrinde kullanılmaz). Hiçbir araç açık
 * değilse vitrinde çerez bandı görünmez ve hiçbir 3. taraf betiği yüklenmez.
 */
export default async function TrackingSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ kaydedildi?: string; hata?: string; politika?: string }>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreAdminAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const since = thirtyDaysAgoIso();
  const [{ data: store }, { data: scopeCustomer }, settingsResult, summaryResult] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle(),
    supabase.from("customers").select("name").eq("id", customerId).maybeSingle(),
    supabase.from("store_tracking_settings").select("*").eq("store_id", storeId).maybeSingle(),
    supabase.rpc("store_consent_summary", { p_store_id: storeId, p_since: since }),
  ]);
  if (!store) notFound();
  const row = settingsResult.data;
  const tableMissing = Boolean(settingsResult.error);
  const settings: StoreTrackingSettings = row
    ? {
        metaPixelId: row.meta_pixel_id,
        metaEnabled: row.meta_enabled,
        ga4MeasurementId: row.ga4_measurement_id,
        ga4Enabled: row.ga4_enabled,
        googleAdsId: row.google_ads_id,
        googleAdsPurchaseLabel: row.google_ads_purchase_label,
        googleAdsEnabled: row.google_ads_enabled,
        consentVersion: row.consent_version,
      }
    : NO_TRACKING;
  const tools = activeTools(settings);
  const openNames = [tools.meta ? "Meta Pixel" : null, tools.ga4 ? "Google Analytics 4" : null, tools.ads ? "Google Ads" : null].filter(Boolean);
  // Faz 29 — onay metninde müşteri adı.
  const scopeLabel = `${scopeCustomer?.name ?? "?"} · ${store.name}`;
  const summary = new Map((summaryResult.data ?? []).map((item) => [item.action, Number(item.total)]));

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Takip ve Reklam</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Meta Pixel, Google Analytics 4 ve Google Ads yalnız ziyaretçi sitenin altındaki çerez bandında izin verirse yüklenir. Kimlikler yalnız bu mağaza için
        geçerlidir.
      </p>

      <div className={`mt-4 rounded-md border p-3 text-sm ${tools.any ? "border-amber-300 bg-amber-50 text-amber-900" : "border-black/10 bg-black/[0.02] text-foreground/70"}`}>
        {tools.any ? `Açık: ${openNames.join(", ")} → sitede çerez bandı görünür.` : "Hiçbir araç açık değil → sitede çerez bandı görünmez ve hiçbir takip betiği yüklenmez."}
        <span className="mt-1 block text-xs">Rıza sürümü: {settings.consentVersion}</span>
      </div>
      <div className="mt-3 rounded-md border border-black/10 p-3 text-xs text-foreground/70">
        Bir araç açıldığında ya da kapatıldığında Çerez Politikası otomatik olarak yeni sürümle güncellenir (üçüncü taraf çerezleri bölümü gerçek ayardan dolar),
        ziyaretçilere izin yeniden sorulur ve yeni sürüm için hukukçu kontrolü yenilenmelidir (Mağaza → Yasal Metinler → Çerez Politikası).
      </div>

      {tableMissing ? <p className="mt-3 text-sm text-amber-700">Tablo bulunamadı — migration 0051 henüz uygulanmamış olabilir.</p> : null}
      {sp.kaydedildi ? <p className="mt-3 text-sm text-green-700">{scopeLabel} için takip ayarları kaydedildi.</p> : null}
      {sp.politika && sp.politika !== "hata" ? (
        <p className="mt-2 text-sm text-amber-800">
          Araç kümesi değişti: Çerez Politikası sürüm {sp.politika} oluşturuldu ve ziyaretçilere izin yeniden sorulacak.{" "}
          <Link href={`/dashboard/customers/${customerId}/stores/${storeId}/legal/cookies`} className="underline">
            Hukukçu kontrolünü yenileyin
          </Link>
          .
        </p>
      ) : null}
      {sp.politika === "hata" ? <p className="mt-2 text-sm text-red-700">Çerez Politikası yeni sürümü oluşturulamadı; Yasal Metinler&apos;den yayımlayın.</p> : null}
      {sp.hata ? <p className="mt-3 text-sm text-red-700">{sp.hata}</p> : null}

      <form action={updateTrackingSettingsAction.bind(null, customerId, storeId)} className="mt-6 grid gap-5">
        <fieldset className="rounded-lg border border-black/10 p-4">
          <legend className="px-1 text-sm font-semibold">Meta Pixel</legend>
          <label className="mt-1 block text-sm">
            Pixel kimliği
            <input name="metaPixelId" defaultValue={settings.metaPixelId ?? ""} inputMode="numeric" placeholder="ör. 123456789012345" className={inputClasses} />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="metaEnabled" defaultChecked={settings.metaEnabled} className="h-4 w-4" /> Açık (reklam/pazarlama izniyle yüklenir)
          </label>
        </fieldset>

        <fieldset className="rounded-lg border border-black/10 p-4">
          <legend className="px-1 text-sm font-semibold">Google Analytics 4</legend>
          <label className="mt-1 block text-sm">
            Ölçüm kimliği
            <input name="ga4MeasurementId" defaultValue={settings.ga4MeasurementId ?? ""} placeholder="G-XXXXXXXXXX" className={inputClasses} />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="ga4Enabled" defaultChecked={settings.ga4Enabled} className="h-4 w-4" /> Açık (analitik izniyle yüklenir)
          </label>
        </fieldset>

        <fieldset className="rounded-lg border border-black/10 p-4">
          <legend className="px-1 text-sm font-semibold">Google Ads</legend>
          <label className="mt-1 block text-sm">
            Google Ads kimliği
            <input name="googleAdsId" defaultValue={settings.googleAdsId ?? ""} placeholder="AW-123456789" className={inputClasses} />
          </label>
          <label className="mt-3 block text-sm">
            Satın alma dönüşüm etiketi (isteğe bağlı)
            <input name="googleAdsPurchaseLabel" defaultValue={settings.googleAdsPurchaseLabel ?? ""} placeholder="ör. AbC-D_efG" className={inputClasses} />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="googleAdsEnabled" defaultChecked={settings.googleAdsEnabled} className="h-4 w-4" /> Açık (reklam/pazarlama izniyle yüklenir)
          </label>
        </fieldset>

        <div>
          <ConfirmSubmitButton
            label="Kaydet"
            confirmText={`${scopeLabel}\n\nTakip ayarları kaydedilsin mi? Açık araç kümesi değişirse Çerez Politikası yeni sürümle güncellenir ve ziyaretçilere izin yeniden sorulur.`}
          />
        </div>
      </form>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Son 30 gün — çerez kararları</h2>
        {summaryResult.error ? (
          <p className="mt-2 text-xs text-foreground/60">Sayılar okunamadı (migration 0051 uygulanmamış olabilir).</p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {Object.entries(ACTION_LABELS).map(([action, label]) => (
              <li key={action} className="rounded-md border border-black/10 p-3">
                <span className="block text-xs text-foreground/60">{label}</span>
                <span className="text-lg font-semibold">{summary.get(action) ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-foreground/50">Kayıtlar rızanın ispatı içindir; IP adresi ya da tarayıcı bilgisi tutulmaz.</p>
      </section>
    </div>
  );
}
