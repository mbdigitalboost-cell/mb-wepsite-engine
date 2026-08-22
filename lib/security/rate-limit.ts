import "server-only";

/**
 * Basit, bellek-içi (in-memory) hız sınırlama (rate limiting).
 *
 * DÜRÜSTLÜK NOTU (kullanıcıya raporlanmalı): bu, dağıtık/kalıcı bir
 * rate limiter DEĞİLDİR. Vercel'in serverless fonksiyonları birden
 * fazla instance'ta paralel çalışabilir ve her instance kendi
 * belleğinde ayrı bir sayaç tutar — yani bir saldırgan farklı
 * instance'lara denk gelerek (ya da bir soğuk başlangıç sonrası) bu
 * limiti aşabilir. Yine de: (1) tek bir instance üzerinden yapılan
 * basit/otomatik spam denemelerini gerçek zamanlı olarak durdurur,
 * (2) e-posta bildirim kotasını (Resend vb.) ve Supabase insert
 * çağrılarını gereksiz yükten korur, (3) sıfır ek maliyetli/altyapısız
 * çalışır. Gerçek/kalıcı bir çözüm için ileride (Petra'nın gerçek
 * Supabase/Vercel projesi kurulduğunda) Upstash Redis tabanlı bir
 * rate limiter (örn. `@upstash/ratelimit`) önerilir — bu, o zamana
 * kadarki en iyi düşük-efor çözümdür.
 */

interface RateLimitOptions {
  /** Bu süre penceresi içinde izin verilen maksimum istek sayısı. */
  limit: number;
  /** Pencere uzunluğu (ms). */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Limit aşıldıysa, tekrar denemeden önce beklenmesi gereken süre (ms). */
  retryAfterMs?: number;
}

// Modül seviyesinde tutuluyor — sıcak (warm) bir serverless instance
// yeniden kullanıldığı sürece istekler arasında paylaşılır.
const hits = new Map<string, number[]>();

// Map'in sınırsız büyümesini önlemek için: her çağrıda, hiç yakın
// zamanlı isteği olmayan anahtarları temizle (basit, senkron, ucuz).
const MAX_TRACKED_KEYS = 5000;

function cleanup(now: number, windowMs: number) {
  if (hits.size <= MAX_TRACKED_KEYS) return;
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}

/**
 * Sabit anahtar (örn. "discovery-request:<ip>") başına kayan pencereli
 * (sliding window) basit sayaç. Saf senkron, dış bağımlılık yok.
 */
export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanup(now, windowMs);

  const existing = hits.get(key) ?? [];
  const withinWindow = existing.filter((t) => now - t < windowMs);

  if (withinWindow.length >= limit) {
    const oldestInWindow = withinWindow[0];
    hits.set(key, withinWindow);
    return { allowed: false, retryAfterMs: windowMs - (now - oldestInWindow) };
  }

  withinWindow.push(now);
  hits.set(key, withinWindow);
  return { allowed: true };
}

/**
 * İsteği yapan tarafın IP adresini, Vercel/proxy ortamında en güvenilir
 * şekilde çıkarır. `x-forwarded-for` birden çok IP içerebilir (proxy
 * zinciri) — ilk (en gerçek istemciye en yakın) değeri kullanıyoruz.
 * Hiçbir header yoksa (örn. yerel geliştirme) sabit bir anahtar
 * kullanılır — bu, prod'da (Vercel her zaman bu header'ları ekler)
 * gerçek IP'siz kalmaz.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
