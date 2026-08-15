/**
 * Shown on every CMS dashboard page (content/hero/media/seo/tracking/
 * leads/settings) when `loadCustomerConnection()` returns `null` — no
 * active website with a connection key yet, or that key has no working
 * Supabase project configured (today's real state for every customer,
 * Petra included, until real Vercel env vars are set). Never a crash,
 * always this explicit, honest message.
 */
export function CmsUnavailableNotice() {
  return (
    <div className="rounded-lg border border-dashed border-black/15 p-6 text-sm text-foreground/60">
      <p className="font-medium text-foreground">CMS bağlantısı bekleniyor</p>
      <p className="mt-2">
        Bu müşteri için henüz aktif bir website + Supabase bağlantısı
        yapılandırılmamış (<code className="text-xs">SUPABASE_URL_&lt;KEY&gt;</code>,{" "}
        <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY_&lt;KEY&gt;</code> ortam
        değişkenleri eksik olabilir). Public site bu sırada mevcut statik
        içerikle çalışmaya devam eder — hiçbir şey bozulmaz.
      </p>
    </div>
  );
}
