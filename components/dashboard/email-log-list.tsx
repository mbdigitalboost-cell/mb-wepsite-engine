import { EMAIL_KIND_LABELS, type EmailKind } from "@/lib/commerce/order-emails/settings";

export interface EmailLogListRow {
  id: string;
  kind: string;
  recipient: string;
  status: string;
  error: string | null;
  attempts: number;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  sent: { label: "Gönderildi", className: "text-green-700" },
  failed: { label: "Gönderilemedi", className: "text-red-700" },
  skipped: { label: "Gönderilmedi", className: "text-amber-700" },
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
}

/**
 * Faz 40 — e-posta gönderim kaydı tablosu (Ayarlar → E-posta'da son 20,
 * sipariş detayında o siparişin kayıtları). İçerik gösterilmez; kayıtta zaten
 * yoktur. `resendAction` verilirse gönderilmemiş satırlarda "Tekrar gönder"
 * düğmesi çıkar.
 */
export function EmailLogList({
  rows,
  emptyText,
  resendAction,
}: {
  rows: EmailLogListRow[];
  emptyText: string;
  resendAction?: (logId: string) => () => Promise<void>;
}) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-foreground/50">{emptyText}</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-foreground/50">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Tür</th>
            <th className="py-1.5 pr-3 font-medium">Alıcı</th>
            <th className="py-1.5 pr-3 font-medium">Durum</th>
            <th className="py-1.5 pr-3 font-medium">Zaman</th>
            {resendAction ? <th className="py-1.5 font-medium" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = STATUS_LABELS[row.status] ?? { label: row.status, className: "" };
            return (
              <tr key={row.id} className="border-t border-black/5 align-top">
                <td className="py-1.5 pr-3">{EMAIL_KIND_LABELS[row.kind as EmailKind] ?? row.kind}</td>
                <td className="py-1.5 pr-3 break-all">{row.recipient}</td>
                <td className="py-1.5 pr-3">
                  <span className={status.className}>{status.label}</span>
                  {row.attempts > 1 ? <span className="text-xs text-foreground/50"> · {row.attempts}. deneme</span> : null}
                  {row.error ? <div className="text-xs text-foreground/50">{row.error}</div> : null}
                </td>
                <td className="py-1.5 pr-3 whitespace-nowrap">{formatWhen(row.updated_at)}</td>
                {resendAction ? (
                  <td className="py-1.5">
                    {row.status !== "sent" && row.kind !== "test" ? (
                      <form action={resendAction(row.id)}>
                        <button type="submit" className="rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/5">
                          Tekrar gönder
                        </button>
                      </form>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
