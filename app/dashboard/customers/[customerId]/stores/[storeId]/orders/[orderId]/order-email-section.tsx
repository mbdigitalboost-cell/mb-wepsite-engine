import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmailLogList } from "@/components/dashboard/email-log-list";
import { resendOrderEmailAction } from "../../settings/email-settings-actions";

const RESEND_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  gonderildi: { text: "E-posta gönderildi.", ok: true },
  hata: { text: "E-posta yine gönderilemedi. Ayrıntı aşağıdaki satırda.", ok: false },
  "uygun-degil": { text: "Bu e-posta şu an gönderilemez (siparişin durumu ya da ödemesi bu e-posta için uygun değil).", ok: false },
  zaten: { text: "Bu e-posta daha önce gönderilmiş.", ok: true },
};

/**
 * Faz 40 — sipariş detayında bu siparişin e-posta kayıtları. Gönderilemeyen
 * ya da gönderilmeyen (ayar yok, alıcı yok, tür kapalı) e-postalar burada
 * görünür ve "Tekrar gönder" ile yeniden denenebilir. E-posta sorunu sipariş
 * akışını hiçbir zaman durdurmaz; bu bölüm yalnız görünürlük sağlar.
 */
export async function OrderEmailSection({
  customerId,
  storeId,
  orderId,
  customerEmail,
  resendStatus,
}: {
  customerId: string;
  storeId: string;
  orderId: string;
  customerEmail: string | null;
  resendStatus?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: logs } = await supabase
    .from("order_email_log")
    .select("id, kind, recipient, status, error, attempts, updated_at")
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  const detailPath = `/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`;
  const message = resendStatus ? RESEND_MESSAGES[resendStatus] : undefined;

  return (
    <section className="mt-6 rounded-lg border border-black/10 p-4" id="eposta">
      <h2 className="text-sm font-semibold tracking-tight">E-postalar</h2>
      {!customerEmail ? <p className="mt-2 text-xs text-foreground/50">Müşteri e-posta adresi vermedi; müşteriye e-posta gönderilemez.</p> : null}
      {message ? <p className={`mt-2 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p> : null}
      <EmailLogList
        rows={logs ?? []}
        emptyText="Bu sipariş için e-posta kaydı yok."
        resendAction={(logId) => resendOrderEmailAction.bind(null, customerId, storeId, logId, detailPath)}
      />
    </section>
  );
}
