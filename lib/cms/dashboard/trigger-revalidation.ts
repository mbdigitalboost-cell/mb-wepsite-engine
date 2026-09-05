import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Faz 4G — B (birincil, anlık) mekanizması. `revalidatePublicPathsForType`
 * (content/[type]/actions.ts'te) SADECE bu Server Action'ın kendi çalıştığı
 * deployment'ın (panel — mb-digital-boost-web-panel) route cache'ini
 * hedefler; panel public route'ları hiç servis etmediği için bu
 * revalidation'ın gerçek bir hedefi yoktur (bkz. FAZ 4G teşhis raporu). Bu
 * fonksiyon, ilgili müşterinin GERÇEK production domain'ine (Platform
 * DB'nin `websites.domain` kolonundan — `lib/cms/resolve-customer-connection.ts`
 * `resolveConnectionKeyForCustomer`'ıyla BİREBİR aynı sorgu deseni) imzalı
 * bir POST isteğiyle o deployment'ın KENDİ /api/revalidate route'unu
 * tetikler.
 *
 * Müşteriye özel HİÇBİR dallanma yok — customerId → domain eşlemesi
 * Platform DB'den, secret tek bir ortak env değişkeninden
 * (`REVALIDATE_WEBHOOK_SECRET`) geliyor; bu fonksiyon hangi müşteri
 * olduğunu hiç bilmeden çalışır.
 *
 * Domain bulunamazsa (henüz yayında olmayan/domain'i ayarlanmamış bir
 * müşteri) veya secret yapılandırılmamışsa SESSİZCE atlanır — admin
 * kaydını asla bozmaz (throw etmez), sadece console.warn.
 *
 * `await` ediliyor (fire-and-forget DEĞİL): Vercel'in serverless
 * fonksiyon modelinde, yanıt gönderildikten/fonksiyon return ettikten
 * sonra bekletilmeyen bir Promise'in gerçekten tamamlanacağı garanti
 * değildir — özellikle `createContentItemAction`'daki `redirect()`'ten
 * ÖNCE çağrıldığı için, awaitlenmezse istek hiç gönderilmeden fonksiyon
 * sonlanabilir. 3 saniyelik timeout, bunun admin'in "Kaydet" tıklamasını
 * anlamsız şekilde uzun süre bekletmesini engelliyor — worst-case ek
 * gecikme 3sn, sonsuz değil.
 *
 * Faz 6C: bu fonksiyon önceden `content/[type]/actions.ts` içinde
 * export edilmeyen bir private helper'dı. O dosyanın tepesinde
 * `"use server"` olduğu için (Next.js/React'in Server Actions modeli:
 * "use server" içeren bir dosyadan yapılan HER export bir Server
 * Action'a dönüşür) buradan export etmek onu istemeden bir Server
 * Action'a çevirirdi — hiç client'tan çağrılması amaçlanmamış bir
 * fonksiyon için yanlış olurdu. Bu yüzden davranış BİREBİR AYNI kalarak
 * "use server" İÇERMEYEN bu ayrı, server-only modüle taşındı — artık
 * settings/navigation/seo/tracking/content-hero/content-[type]
 * action'larının hepsi buradan import ediyor, hiçbiri kendi private
 * kopyasını tutmuyor. Bu fonksiyon KENDİSİ bir yetkilendirme katmanı
 * DEĞİLDİR — her çağıran, kendi `requireCustomerWriteAccess(customerId)`
 * (veya store eşdeğeri) kontrolünü DB yazımından önce zaten yapmış
 * olmalı; bu helper sadece o başarılı yazımdan SONRA çağrılan, saf bir
 * cache-invalidation sinyali.
 */
export async function triggerRemoteRevalidation(customerId: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  let domain: string | null;
  try {
    const platformAdmin = createSupabaseAdminClient();
    const { data, error } = await platformAdmin
      .from("websites")
      .select("domain")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[revalidate] websites lookup failed:", error.message);
      return;
    }
    domain = data?.domain ?? null;
  } catch (err) {
    console.warn("[revalidate] platform admin client unavailable:", err);
    return;
  }

  if (!domain) {
    console.warn(`[revalidate] no active website domain for customerId=${customerId}, skipping remote revalidate`);
    return;
  }

  const secret = process.env.REVALIDATE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[revalidate] REVALIDATE_WEBHOOK_SECRET not configured, skipping remote revalidate");
    return;
  }

  // TEMP DEBUG (Faz 4G — 401 teşhisi, kalıcı değil, değer asla loglanmıyor):
  console.warn("[revalidate-debug] sending secretLen=%d to domain=%s", secret.length, domain);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`https://${domain}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Secret header'da taşınıyor, query string'de DEĞİL — URL'ler
        // (Vercel access logları dahil) loglanabilir, header gövdesi
        // aynı ölçüde loglanmaz.
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ paths }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[revalidate] remote revalidate failed for ${domain}: HTTP ${response.status}`);
      return;
    }
    console.log(`[revalidate] remote revalidate ok for ${domain}:`, paths);
  } catch (err) {
    console.warn(`[revalidate] remote revalidate request failed for ${domain}:`, err);
  } finally {
    clearTimeout(timeout);
  }
}
