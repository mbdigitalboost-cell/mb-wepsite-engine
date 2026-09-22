/**
 * Domain → mağaza slug eşlemesi ("tek deployment, domain-bazlı yönlendirme"
 * mimarisi — 2026-09'da Petra tarzı "her müşteriye ayrı branch + ayrı Vercel
 * projesi" yerine seçildi; amaç, yeni bir mağaza eklendiğinde kod/deployment
 * çoğaltmaya gerek kalmaması — bkz. proxy.ts'deki rewriteForStoreDomain).
 *
 * Şu an BOŞ — hiçbir mağazanın kendi domain'i henüz satın alınmadı/eklenmedi.
 * Boşken proxy.ts'deki rewrite mantığı her zaman devre dışı kalır, yani bu
 * dosyanın var olması bugünkü davranışı hiç etkilemez.
 *
 * Yeni bir domain eklerken (ör. Taktikalp46 için taktikalp46.com alınınca):
 *   1. Domain'i satın al.
 *   2. Vercel'de mb-digital-boost-web-panel projesine ekle
 *      (Project Settings → Domains → Add).
 *   3. Aşağıya TEK satır ekle: "taktikalp46.com": "taktikalp46".
 *      (Sol taraf = tam domain adı, küçük harf; sağ taraf = stores.slug.)
 *   4. Commit + push + deploy.
 * Bu kadar — kodun başka hiçbir yerine dokunmaya gerek yok, aynı mağaza
 * hem taktikalp46.com hem mb-digital-boost-web-panel.vercel.app/store/taktikalp46
 * üzerinden erişilebilir kalır (ikincisi admin/test amaçlı).
 *
 * NOT: www. ve apex (www.taktikalp46.com ↔ taktikalp46.com) yönlendirmesi
 * Vercel'in kendi domain ayarlarında (Redirect to canonical) yapılmalı —
 * burada sadece kanonik domain'i tek satır olarak listelemek yeterli.
 */
export const STORE_DOMAINS: Record<string, string> = {
  // "taktikalp46.com": "taktikalp46",
};
