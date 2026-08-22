/**
 * Open-redirect koruması (PHASE_0_ADMIN_PLATFORM_AUDIT.md, Bulgu H1).
 *
 * Bir Server Action/Route Handler'ın "işlem bitince nereye dön" gibi bir
 * `next`/`redirectTo` parametresini KULLANICI GİRDİSİNDEN (query string,
 * form alanı) okuyup doğrudan `redirect()`/`NextResponse.redirect()`'e
 * vermesi klasik bir open-redirect açığıdır: `next=@evil.com` veya
 * `next=//evil.com` gibi bir değer, tarayıcının URL ayrıştırma
 * kurallarını kullanarak kullanıcıyı bu sitenin dışına yönlendirebilir —
 * özellikle bu değer bir e-posta linkinin (invite/parola sıfırlama)
 * parçasıysa, meşru domain görünümlü bir phishing linkine dönüşür.
 *
 * `resolveSafeNextPath` bunun tek düzeltmesi: gelen değeri asla olduğu
 * gibi güvenmez, yalnızca "bu sitenin İÇİNDE, aynı origin'e ait bir
 * path" olduğu kanıtlanabiliyorsa kabul eder — aksi halde sessizce
 * `fallback`'e düşer. Böylece hiçbir çağıran, yanlışlıkla güvenilmeyen
 * bir değeri redirect'e vermiş olamaz.
 */
export function resolveSafeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;

  // Tek bir "/" ile başlamalı (kök-göreli path) — "//evil.com" (protocol-
  // relative URL, tarayıcı bunu ayrı bir host olarak yorumlar) veya
  // "https://evil.com" gibi mutlak URL'leri burada eler.
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  // "@" veya ":" içeren bir path, bazı tarayıcı/URL-parser tutarsızlıkları
  // nedeniyle yine de bir userinfo/host enjeksiyonuna dönüşebilir (örn.
  // "/@evil.com" bazı eski parser'larda host değişikliğine yol açabilir).
  // Meşru bir dashboard path'inin bu karakterlere ihtiyacı yok, o yüzden
  // en güvenlisi tamamen reddetmek.
  if (value.includes("@") || value.includes(":") || value.includes("\\")) {
    return fallback;
  }

  // Kontrol karakteri veya whitespace içeren path'leri de reddet (bazı
  // tarayıcılar boşluk/kontrol karakterlerini sessizce temizleyip
  // yorumu değiştirebilir).
  if (/[\x00-\x1f\s]/.test(value)) {
    return fallback;
  }

  return value;
}
