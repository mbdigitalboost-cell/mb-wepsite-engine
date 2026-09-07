/**
 * Petra Hero — kırmızı atmosferik motion katmanı (Faz "Hero Motion"):
 * (A) hafif kırmızı hava akışı çizgileri + (E) yavaş kırmızı glow/pulse.
 *
 * Tamamen dekoratif, EK bir katman — `HeroBackground`'ın mevcut
 * main/background/ambient katmanlarının HİÇBİRİNE dokunmuyor, mevcut
 * mouse/touch parallax davranışıyla hiç etkileşmiyor (bu component
 * `parallax` prop'u almıyor, JS state'i yok — saf CSS `@keyframes`,
 * `app/globals.css`). `aria-hidden`/`pointer-events-none` — ekran
 * okuyucularda görünmez, tıklamaları/hover'ı engellemez.
 *
 * Sadece `transform`/`opacity` animasyonu (CLS riski sıfır — `left/top/
 * width/height` hiç değişmiyor). `prefers-reduced-motion: reduce` iken
 * `app/globals.css`'in ZATEN VAR OLAN global kuralı (`*, *::before,
 * *::after { animation-duration: 0.01ms !important; ... }`) bu
 * animasyonları da otomatik olarak neredeyse-durağan hale getiriyor —
 * ayrı bir JS kontrolü GEREKMİYOR, `.animate-reference-fade`'in zaten
 * kullandığı mekanizmanın aynısı.
 *
 * Renk: `var(--color-brand-primary)` — Petra'nın ThemeProvider üzerinden
 * gelen KENDİ kırmızısı (`lib/theme/petra-theme.ts`, `#E31E24`), keyfi
 * yeni bir kırmızı DEĞİL.
 *
 * Responsive yoğunluk: mobilde en düşük (`opacity-*` çarpanı), tablette
 * orta, masaüstünde tam — animasyonun KENDİSİ (süre/keyframe) her
 * breakpoint'te aynı, sadece görünürlük/yoğunluk Tailwind'in responsive
 * opacity sınıflarıyla azaltılıyor (ayrı, breakpoint'e özel süre
 * yönetimi eklenmedi — en düşük karmaşıklık).
 */
export function HeroAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* (E) Kırmızı glow/pulse — yavaş, nefes alan bir opacity döngüsü. */}
      <div className="absolute -inset-1/4 opacity-40 md:opacity-70 lg:opacity-100">
        <div
          className="hero-atmosphere-glow absolute inset-0"
          style={{
            background: "radial-gradient(circle at 32% 62%, var(--color-brand-primary), transparent 58%)",
          }}
        />
      </div>

      {/* (A) Kırmızı hava akışı çizgileri — 3 basit, sabit eğri; sadece
          transform (translate) + opacity animasyonlu, path'in kendisi
          hiç değişmiyor (stroke-dash animasyonu YOK — sadece
          transform/opacity kuralına uymak için). */}
      <svg
        className="absolute inset-0 h-full w-full opacity-30 md:opacity-50 lg:opacity-70"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M -100 420 C 200 380, 500 460, 1100 360"
          stroke="var(--color-brand-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="hero-atmosphere-airflow"
        />
        <path
          d="M -100 300 C 250 340, 550 220, 1100 300"
          stroke="var(--color-brand-primary)"
          strokeWidth="1"
          strokeLinecap="round"
          className="hero-atmosphere-airflow"
          style={{ animationDelay: "-6s" }}
        />
        <path
          d="M -100 500 C 300 470, 600 540, 1100 480"
          stroke="var(--color-brand-primary)"
          strokeWidth="1"
          strokeLinecap="round"
          className="hero-atmosphere-airflow"
          style={{ animationDelay: "-11s" }}
        />
      </svg>
    </div>
  );
}
