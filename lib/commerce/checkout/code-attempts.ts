/**
 * Faz 32 — İNDİRİM KODU DENEME SINIRI (saf çekirdek; testli:
 * tests/checkout-discount.test.ts). Kod tahminini (numaralandırmayı)
 * yavaşlatmak için yalnız BAŞARISIZ denemeler ("geçersiz kod") sayılır:
 * doğru bir kodu, sepet/ödeme yöntemi değiştikçe yeniden doğrulamak hakkı
 * yemez. Anahtar = HMAC(mağaza + IP) — ham IP saklanmaz (bkz.
 * code-attempts-server.ts).
 *
 * Depolama iki katmanlı: kalıcı tablo (migration 0047,
 * discount_code_attempts — tüm serverless instance'lar paylaşır) + tablo
 * yoksa/hata verirse instance belleği (lib/security/rate-limit.ts'in aynı
 * "en iyi çaba" sınırlaması). Böylece kod, migration uygulanmadan da
 * güvenle yayınlanabilir.
 */

export const CODE_ATTEMPT_LIMIT = 5;
export const CODE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export interface AttemptStore {
  /** `since` sonrası kayıtlı başarısız deneme sayısı; depolama kullanılamıyorsa null. */
  countSince(key: string, since: Date): Promise<number | null>;
  /** Başarısız denemeyi kaydeder; yazılamadıysa false. */
  record(key: string, at: Date): Promise<boolean>;
}

const MAX_MEMORY_KEYS = 5000;

export function createMemoryAttemptStore(): AttemptStore {
  const hits = new Map<string, number[]>();
  return {
    async countSince(key, since) {
      const recent = (hits.get(key) ?? []).filter((t) => t > since.getTime());
      hits.set(key, recent);
      return recent.length;
    },
    async record(key, at) {
      if (hits.size > MAX_MEMORY_KEYS) {
        const cutoff = at.getTime() - CODE_ATTEMPT_WINDOW_MS;
        for (const [k, list] of hits) {
          const recent = list.filter((t) => t > cutoff);
          if (recent.length === 0) hits.delete(k);
          else hits.set(k, recent);
        }
      }
      hits.set(key, [...(hits.get(key) ?? []), at.getTime()]);
      return true;
    },
  };
}

/** Önce kalıcı depo; o kullanılamıyorsa bellek. */
export function withFallback(primary: AttemptStore, fallback: AttemptStore): AttemptStore {
  return {
    async countSince(key, since) {
      const count = await primary.countSince(key, since);
      return count ?? fallback.countSince(key, since);
    },
    async record(key, at) {
      return (await primary.record(key, at)) || fallback.record(key, at);
    },
  };
}

export async function isCodeAttemptBlocked(store: AttemptStore, key: string, now = new Date()): Promise<boolean> {
  const count = await store.countSince(key, new Date(now.getTime() - CODE_ATTEMPT_WINDOW_MS));
  return (count ?? 0) >= CODE_ATTEMPT_LIMIT;
}

export async function recordFailedCodeAttempt(store: AttemptStore, key: string, now = new Date()): Promise<void> {
  await store.record(key, now);
}
