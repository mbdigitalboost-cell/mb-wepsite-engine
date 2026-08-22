/**
 * JSON-LD (yapılandırılmış veri) render eden TEK, denetlenmiş bileşen.
 *
 * GÜVENLİK (PHASE_0_ADMIN_PLATFORM_AUDIT.md, Bulgu H3): Bu projede 7
 * farklı yerde `<script dangerouslySetInnerHTML={{ __html:
 * JSON.stringify(data) }} />` deseni tekrarlanıyordu. `JSON.stringify`
 * `<` karakterini KAÇIRMAZ — eğer `data` içindeki herhangi bir alan
 * (örn. `lib/seo/structured-data.ts`'in `petraBreadcrumbStructuredData`
 * fonksiyonuna geçirilen `solution.title`, Supabase CMS'ten/admin
 * panelinden gelen bir değer) `</script><script>...` gibi bir dizi
 * içerirse, tarayıcı bunu script bloğunun bittiği yer olarak yorumlar ve
 * saldırganın enjekte ettiği ikinci `<script>` bloğu ÇALIŞIR — bu, admin
 * panelinden (veya ele geçirilmiş bir admin hesabından) TÜM public site
 * ziyaretçilerini etkileyen bir stored XSS'e dönüşür.
 *
 * Düzeltme: `<` karakterini `<` olarak kaçırmak (Next.js'in kendi
 * dokümantasyonunda önerdiği standart desen) — bu, geçerli JSON'u
 * bozmaz (JSON string'leri içinde `\uXXXX` kaçışı zaten standarttır) ama
 * `</script>` dizisinin asla oluşmasını engeller.
 *
 * Bu bileşen dışında hiçbir yerde JSON-LD için `dangerouslySetInnerHTML`
 * kullanılmamalı — yeni bir yapılandırılmış veri bloğu eklenecekse bu
 * bileşen üzerinden eklenmeli.
 */
export function JsonLd({ data }: { data: unknown }) {
  const safeJson = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />;
}
