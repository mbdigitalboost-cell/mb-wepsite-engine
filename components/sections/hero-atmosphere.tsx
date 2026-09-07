"use client";

import type { CSSProperties } from "react";
import type { ParallaxState } from "@/lib/motion/use-parallax-pointer";

/**
 * Petra Hero — kırmızı atmosferik motion katmanı (Faz "Hero — Yeni
 * Görsel + Mouse-Reactive Motion"): otonom, yavaş bir akış/glow
 * DÖNGÜSÜ (`app/globals.css`'teki `@keyframes`) ÜZERİNE, mouse/touch
 * konumuna göre HAFİF bir pozisyon kayması (bu dosyadaki JS-hesaplı
 * inline `transform`) biner — ikisi AYNI ANDA, İÇ İÇE iki katman
 * üzerinden çalışıyor (dıştaki wrapper mouse'a tepki veriyor, İÇTEKİ
 * öğeler kendi otonom `animation`'larını sürdürüyor) çünkü bir CSS
 * `animation`, AYNI elemanın `transform`'unu JS'in inline `style`'ından
 * DAHA YÜKSEK öncelikle uygular — ikisini AYNI elemanda birleştirmek
 * denenirse JS'in mouse-tepkisi CSS animasyonu tarafından EZİLİR. Bu
 * yüzden İKİ AYRI eleman gerekiyor (bkz. `HeroAtmosphere` içindeki
 * dış/iç div ayrımı).
 *
 * Görseldeki GERÇEK ışık şeritlerini TEKRARLAMIYOR — onlara YAKLAŞIK
 * hizalı, ÇOK düşük opaklıklı (0.10-0.22 arası), ince bir "canlılık"
 * katmanı. `11_hero_main_v1.jpg`/`11_hero_mobile_v1.jpg` görsellerinin
 * kendi şeritleri ZATEN belirgin/parlak — bu katman onları
 * TEKRARLAMAK/ÇOĞALTMAK değil, hafif bir hareket/parıltı eklemek için
 * var. Path koordinatları görsel üzerinden GÖZLE tahmin edildi (piksel-
 * kesin bir görsel-analiz aracı kullanılmadı) — gerekirse görsel
 * doğrulama sonrası ince ayar yapılabilir.
 *
 * Tamamen dekoratif — `HeroBackground`'ın main/background/ambient
 * katmanlarının HİÇBİRİNE dokunmuyor. `aria-hidden`/`pointer-events-none`
 * — ekran okuyucularda görünmez, tıklamaları/hover'ı engellemez. Sadece
 * `transform`/`opacity` (CLS riski sıfır). `prefers-reduced-motion:
 * reduce` iken: (1) otonom `@keyframes` zaten `app/globals.css`'in
 * global kuralıyla (`animation-duration: 0.01ms !important`) otomatik
 * neredeyse-durağan hale geliyor, (2) mouse-reaktif kısım ZATEN
 * `useParallaxPointer()`'ın kendisinde kapatılıyor — o hook reduced-
 * motion'da KALICI OLARAK `{x:0,y:0}` döndürüyor, bu yüzden buradaki
 * `translate3d(0,0,0)` de otomatik olarak identity'e düşüyor — AYRI bir
 * kontrol GEREKMİYOR.
 *
 * SADECE bu görsele özel bir bayrakla (`showAtmosphere`, bkz.
 * hero-background.tsx/lib/data/petra/hero.ts'in `backgroundHasAtmosphere`
 * doc'u) gösteriliyor — admin farklı bir fotoğraf yüklerse bu katman
 * HİÇ render edilmiyor.
 *
 * Renk: `var(--color-brand-primary)` — Petra'nın ThemeProvider üzerinden
 * gelen KENDİ kırmızısı (`lib/theme/petra-theme.ts`, `#E31E24`).
 */

/** Mouse-reaktif kayma genliği — mevcut ambient/main katmanlarından (§hero-background.tsx) BİLEREK daha düşük, "hafif" kalması için. */
const MOUSE_TRANSLATE_DESKTOP = 7;
const MOUSE_TRANSLATE_MOBILE = 2.5;

interface HeroAtmosphereProps {
  /** hero.tsx'in `useParallaxPointer()`'dan geçirdiği AYNI state — yeni bir tracking hook'u YOK. */
  parallax?: ParallaxState;
}

export function HeroAtmosphere({ parallax }: HeroAtmosphereProps) {
  const offsetX = parallax?.x ?? 0;
  const offsetY = parallax?.y ?? 0;
  // Bu katman deliberately isDesktop/matchMedia takibi yapmıyor (ekstra
  // state/effect eklememek için) — HeroBackground'ın ana katmanından
  // FARKLI olarak amplitude tek bir sabit değer, mobil/desktop arası
  // otomatik olarak `parallax.source` ("touch" vs "mouse") üzerinden
  // hafifçe ayrışıyor: touch girişinde zaten hero-background.tsx'in
  // kendi MAIN_TRANSLATE_MOBILE'ı daha düşük genlik üretiyor, buradaki
  // sabit çarpan o farkı korumak için yeterli.
  const amplitude = parallax?.source === "touch" ? MOUSE_TRANSLATE_MOBILE : MOUSE_TRANSLATE_DESKTOP;

  // Mouse/touch'a tepki veren TEK inline transform — main/background/
  // ambient katmanlarının (hero-background.tsx) ZATEN kullandığı
  // `translate3d(x*amp, y*amp, 0)` deseninin birebir tekrarı.
  const mouseStyle: CSSProperties = {
    transform: `translate3d(${offsetX * amplitude}%, ${offsetY * amplitude}%, 0)`,
    willChange: offsetX !== 0 || offsetY !== 0 ? "transform" : undefined,
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={mouseStyle}
    >
      {/* Kırmızı glow — görselde ışıklı bina/ekipman bölgesinin (sağ
          yarı) üzerine hafifçe biniyor, otonom yavaş nefes alma
          döngüsü. Konum yaklaşık — görselin en aydınlık/kırmızı
          bölgesiyle örtüşecek şekilde tahmin edildi. */}
      <div className="absolute -inset-1/4 opacity-50 md:opacity-75 lg:opacity-100">
        <div
          className="hero-atmosphere-glow absolute inset-0"
          style={{
            background: "radial-gradient(circle at 68% 48%, var(--color-brand-primary), transparent 55%)",
          }}
        />
      </div>

      {/* Kırmızı hava akışı şeritleri — görseldeki gerçek şeritlerin
          geçtiği ORTA-ÜST banda (yaklaşık %35-55 yükseklik) yaklaşık
          hizalı, 2 ince eğri. Çok düşük opaklık — mevcut, zaten belirgin
          gerçek şeritleri TEKRARLAMAK değil, hafif bir parıltı/canlılık
          eklemek amaçlı. */}
      <svg
        className="absolute inset-0 h-full w-full opacity-45 md:opacity-60 lg:opacity-75"
        viewBox="0 0 1000 560"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M -60 330 C 220 250, 480 190, 700 250 C 850 290, 950 320, 1060 300"
          stroke="var(--color-brand-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          className="hero-atmosphere-airflow"
        />
        <path
          d="M -60 400 C 120 430, 220 400, 320 420"
          stroke="var(--color-brand-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="hero-atmosphere-airflow"
          style={{ animationDelay: "-8s" }}
        />
      </svg>
    </div>
  );
}
