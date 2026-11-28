import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isEmailProviderConfigured } from "@/lib/notifications/resend";
import { EMAIL_MAX_LENGTH, FROM_NAME_MAX_LENGTH, MAX_NOTIFICATION_EMAILS, toStoreEmailSettings } from "@/lib/commerce/order-emails/settings";
import { EmailLogList } from "@/components/dashboard/email-log-list";
import { sendTestEmailAction, updateEmailSettingsAction } from "./email-settings-actions";

const inputClasses = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

const STATUS_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  kaydedildi: { text: "E-posta ayarı kaydedildi.", ok: true },
  hata: {
    text: `Kaydedilemedi. Gönderen adı (en fazla ${FROM_NAME_MAX_LENGTH} karakter) ve geçerli bir gönderen adresi zorunlu; en fazla ${MAX_NOTIFICATION_EMAILS} bildirim adresi yazılabilir.`,
    ok: false,
  },
  "test-gonderildi": { text: "Test e-postası gönderildi. Gelen kutunuzu kontrol edin.", ok: true },
  "test-ayar-yok": { text: "Test e-postası gönderilmedi: önce e-posta ayarını kaydedin.", ok: false },
  "test-hata": { text: "Test e-postası gönderilemedi. Ayrıntı aşağıdaki gönderim listesinde.", ok: false },
  "test-alici": { text: "Test e-postası gönderilemedi: oturumunuzda geçerli bir e-posta adresi yok.", ok: false },
};

/**
 * Faz 40 — Mağaza → Ayarlar → "E-posta". Sipariş e-postalarının göndereni
 * mağaza başınadır; bu ayar yoksa bu mağaza adına HİÇBİR e-posta gönderilmez
 * (başka bir adrese düşülmez). Kaydetme ve test yalnız store_admin+.
 */
export async function EmailSettingsCard({ customerId, storeId, status }: { customerId: string; storeId: string; status?: string }) {
  const supabase = await createSupabaseServerClient();
  const [{ data: row }, { data: logs }] = await Promise.all([
    supabase
      .from("store_email_settings")
      .select("from_name, from_email, reply_to_email, order_notification_emails, send_order_confirmation, send_shipped, send_cancel_refund, send_store_new_order")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("order_email_log")
      .select("id, kind, recipient, status, error, attempts, updated_at")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  const settings = toStoreEmailSettings(row);
  const message = status ? STATUS_MESSAGES[status] : undefined;
  const providerReady = isEmailProviderConfigured();

  return (
    <div className="mt-8 border-t border-black/10 pt-6" id="eposta">
      <h2 className="text-sm font-semibold tracking-tight">E-posta</h2>
      <p className="mt-1 max-w-2xl text-xs text-foreground/60">
        Sipariş e-postaları (sipariş onayı, kargoya verildi, iptal/iade) ve size gelen yeni sipariş bildirimi bu ayarla gönderilir. Ayar
        kaydedilmemişse bu mağaza adına hiçbir e-posta gönderilmez.
      </p>
      {!providerReady ? <p className="mt-3 text-sm text-amber-700">E-posta sağlayıcısı bu ortamda yapılandırılmamış; gönderim yapılamaz.</p> : null}
      {!settings ? <p className="mt-3 text-sm text-amber-700">Bu mağazanın e-posta ayarı yok; şu an hiçbir e-posta gönderilmiyor.</p> : null}
      {message ? <p className={`mt-3 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p> : null}

      <form action={updateEmailSettingsAction.bind(null, customerId, storeId)} className="mt-4 grid max-w-2xl gap-4">
        <label className="text-sm">
          Gönderen adı
          <input name="fromName" required maxLength={FROM_NAME_MAX_LENGTH} defaultValue={settings?.fromName ?? ""} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">Müşterinin gelen kutusunda gördüğü ad.</span>
        </label>
        <label className="text-sm">
          Gönderen adresi
          <input name="fromEmail" type="email" required maxLength={EMAIL_MAX_LENGTH} defaultValue={settings?.fromEmail ?? ""} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">
            Alan adı e-posta sağlayıcısında doğrulanmış olmalıdır; doğrulanmamış bir adresle gönderim reddedilir.
          </span>
        </label>
        <label className="text-sm">
          Yanıt adresi (isteğe bağlı)
          <input name="replyToEmail" type="email" maxLength={EMAIL_MAX_LENGTH} defaultValue={settings?.replyToEmail ?? ""} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">Boşsa müşterinin yanıtı gönderen adrese gider.</span>
        </label>
        <label className="text-sm">
          Yeni sipariş bildirimi adresleri (her satıra bir adres, en fazla {MAX_NOTIFICATION_EMAILS})
          <textarea name="orderNotificationEmails" rows={3} defaultValue={(settings?.orderNotificationEmails ?? []).join("\n")} className={inputClasses} />
          <span className="mt-1 block text-xs text-foreground/50">Yeni sipariş geldiğinde bu adreslere bildirim gider. Boşsa bildirim gönderilmez.</span>
        </label>
        <fieldset className="grid gap-2 text-sm">
          <legend className="mb-1 text-sm">Gönderilecek e-postalar</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sendOrderConfirmation" defaultChecked={settings?.sendOrderConfirmation ?? true} />
            Müşteriye sipariş onayı
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sendShipped" defaultChecked={settings?.sendShipped ?? true} />
            Müşteriye &quot;kargoya verildi&quot;
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sendCancelRefund" defaultChecked={settings?.sendCancelRefund ?? true} />
            Müşteriye iptal ve iade e-postaları
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sendStoreNewOrder" defaultChecked={settings?.sendStoreNewOrder ?? true} />
            Mağazaya yeni sipariş bildirimi
          </label>
        </fieldset>
        <div>
          <button type="submit" className="h-9 rounded-md bg-brand-accent px-4 text-sm font-medium text-white hover:opacity-90">
            E-posta ayarını kaydet
          </button>
        </div>
      </form>

      <form action={sendTestEmailAction.bind(null, customerId, storeId)} className="mt-4">
        <button type="submit" disabled={!settings || !providerReady} className="h-9 rounded-md border border-black/15 px-4 text-sm font-medium hover:bg-black/5 disabled:opacity-50">
          Bana test e-postası gönder
        </button>
        <p className="mt-1 text-xs text-foreground/50">Kayıtlı ayarla, oturum açtığınız e-posta adresine gönderilir.</p>
      </form>

      <h3 className="mt-6 text-sm font-medium">Son 20 gönderim</h3>
      <EmailLogList rows={logs ?? []} emptyText="Henüz gönderim yok." />
    </div>
  );
}
