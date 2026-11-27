import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

/**
 * Petra SEO iyileştirme — /btu-hesaplama sayfasının açıklayıcı içeriği.
 *
 * SUNUCU bileşeni ("use client" YOK): metin sayfanın sunucu HTML'inde
 * yer alır, Google hesaplayıcının (client) JS'ini çalıştırmadan okur.
 *
 * METİN DOĞRULUĞU — hesaplayıcıyla çelişmemeli (lib/btu/calculate.ts):
 * formül yalnız ALAN × BÖLGE KATSAYISI + KİŞİ SAYISI × sabit yük
 * kullanır. Formdaki tavan yüksekliği, pencere, cephe, güneş, yalıtım ve
 * cihaz alanları hesaba KATILMAZ; sonuç kutusu bunu "bilgi amaçlı,
 * hesaba katılmadı" diye yazar. Bu yüzden "Hesaplama neye göre yapılır?"
 * yalnız üç girdiyi sayar, diğerleri ayrı başlıkta "keşifte
 * değerlendirilir" olarak anlatılır. Formül değişirse bu iki bölüm de
 * birlikte güncellenmelidir.
 *
 * SAYI — metindeki tek sayılar birim dönüşümüdür (1 kW ≈ 3.412 BTU/saat;
 * 12.000 BTU/saat ≈ 3,5 kW). Oda örneği ("20 m² için …") ya da kapasite
 * listesi BİLEREK yok: böyle bir sayı yalnız calculateBtu() çalıştırılarak
 * üretilebilir.
 *
 * REVEAL — her bölüm AYRI bir <Reveal> içinde (yasal sayfalardaki desen).
 * Reveal, öğenin %20'si görününce belirir; içeriğin tamamı tek bir
 * Reveal'a konursa dar telefonlarda blok ekranın 5 katından uzun olur,
 * %20 eşiğine hiç ulaşamaz ve metin görünmez kalır. Reveal yalnız
 * animasyondur: metin her durumda sunucu HTML'indedir.
 */

const headingClasses = "font-[family-name:var(--font-brand-heading)] text-2xl font-semibold text-white sm:text-[28px]";
const textClasses = "text-base leading-relaxed text-brand-muted";
const listClasses = "list-disc space-y-2 pl-5 text-base leading-relaxed text-brand-muted marker:text-brand-primary";
const linkClasses =
  "text-white underline decoration-brand-primary underline-offset-4 transition-colors hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none";

function Term({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white">{children}</strong>;
}

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "Kaç BTU klima almalıyım?",
    answer:
      "Odanın büyüklüğüne, güneş alma ve yalıtım durumuna, kişi sayısına ve ısı üreten cihazlara bağlıdır. Yukarıdaki hesaplayıcı yaklaşık bir değer verir.",
  },
  {
    question: "Hesaplama sonucu kesin mi?",
    answer: "Hayır, ön bilgi amaçlıdır. Kesin kapasite için keşif yapılması önerilir.",
  },
  {
    question: "BTU ile kW arasındaki fark nedir?",
    answer: "İkisi de ısı gücünü ifade eder: 1 kW ≈ 3.412 BTU/saat.",
  },
  {
    question: "Birden fazla oda için tek klima yeter mi?",
    answer:
      "Her odanın ihtiyacı ayrı hesaplanmalıdır. Tek dış üniteye birden fazla iç ünite bağlayan multi-split sistemler bu durumda bir seçenektir.",
  },
];

export function BtuGuide() {
  return (
    <div className="flex flex-col gap-14">
      <Reveal>
        <section aria-labelledby="btu-nedir" className="flex flex-col gap-4">
          <h2 id="btu-nedir" className={headingClasses}>
            BTU nedir?
          </h2>
          <p className={textClasses}>
            BTU (British Thermal Unit), bir ısı enerjisi birimidir. Klimalarda kapasite genellikle BTU/saat olarak ifade edilir. Bu
            değer, klimanın bir saatte ortamdan uzaklaştırabildiği ya da ortama verebildiği ısı miktarını gösterir. 1 kW yaklaşık
            3.412 BTU/saat&apos;e karşılık gelir; örneğin 12.000 BTU/saat yaklaşık 3,5 kW&apos;tır.
          </p>
        </section>
      </Reveal>

      <Reveal>
        <section aria-labelledby="btu-hesaplama-girdileri" className="flex flex-col gap-4">
          <h2 id="btu-hesaplama-girdileri" className={headingClasses}>
            Hesaplama neye göre yapılır?
          </h2>
          <p className={textClasses}>Bu araç yaklaşık ihtiyacı üç bilgiyle hesaplar:</p>
          <ul className={listClasses}>
            <li>
              <Term>Oda alanı:</Term> en ve boy ölçülerinden bulunur.
            </li>
            <li>
              <Term>Bölge:</Term> iklim koşulları bölgeden bölgeye değişir.
            </li>
            <li>
              <Term>Kişi sayısı:</Term> ortamdaki her kişi ısı yayar.
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <section aria-labelledby="btu-diger-etkenler" className="flex flex-col gap-4">
          <h2 id="btu-diger-etkenler" className={headingClasses}>
            Gerçek ihtiyacı başka neler etkiler?
          </h2>
          <p className={textClasses}>Formda sorulan şu bilgiler bu ön hesaba katılmaz; keşifte değerlendirilir:</p>
          <ul className={listClasses}>
            <li>
              <Term>Tavan yüksekliği:</Term> iklimlendirilecek hava hacmini belirler.
            </li>
            <li>
              <Term>Pencere sayısı, cephe ve güneş alma durumu:</Term> güneşten gelen ısı yükünü etkiler.
            </li>
            <li>
              <Term>Yalıtım durumu:</Term> yalıtım zayıfsa ısı kaybı ve kazancı artar.
            </li>
            <li>
              <Term>Elektrikli cihazlar ve aydınlatma:</Term> bilgisayar, mutfak ekipmanı ve yoğun aydınlatma ek ısı üretir.
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <section aria-labelledby="btu-sonuc-yorumu" className="flex flex-col gap-4">
          <h2 id="btu-sonuc-yorumu" className={headingClasses}>
            Sonuç nasıl yorumlanmalı?
          </h2>
          <p className={textClasses}>
            Hesaplama yaklaşık bir değer verir ve sizi en uygun standart klima kapasitesine yönlendirir.
          </p>
          <ul className={listClasses}>
            <li>
              <Term>Kapasite küçük seçilirse</Term> klima sürekli çalışır ve istenen sıcaklığa ulaşmakta zorlanabilir.
            </li>
            <li>
              <Term>Kapasite gereğinden büyük seçilirse</Term> cihaz sık açılıp kapanır, konfor ve nem kontrolü olumsuz
              etkilenebilir.
            </li>
          </ul>
          <p className={textClasses}>
            Birden fazla oda, büyük alanlar veya ticari mekanlar için{" "}
            <Link href="/cozumler/multi-split-klimalar" className={linkClasses}>
              multi-split sistemler
            </Link>
            ,{" "}
            <Link href="/cozumler/profesyonel-klimalar" className={linkClasses}>
              profesyonel klimalar
            </Link>{" "}
            ya da{" "}
            <Link href="/cozumler/vrf-sistemleri" className={linkClasses}>
              VRF sistemleri
            </Link>{" "}
            daha uygun olabilir. Kesin kapasite, mekanın yerinde incelenmesiyle belirlenir:{" "}
            <Link href="/iletisim" className={linkClasses}>
              keşif talep edin
            </Link>
            .
          </p>
        </section>
      </Reveal>

      <Reveal>
        <section aria-labelledby="btu-sss" className="flex flex-col gap-6">
          <h2 id="btu-sss" className={headingClasses}>
            Sık sorulan sorular
          </h2>
          <dl className="flex flex-col divide-y divide-white/10 border-y border-white/10">
            {faqs.map((faq) => (
              <div key={faq.question} className="flex flex-col gap-2 py-5">
                <dt className="text-base font-semibold text-white">{faq.question}</dt>
                <dd className={textClasses}>{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>
    </div>
  );
}
