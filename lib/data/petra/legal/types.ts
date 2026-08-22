/**
 * Petra Mühendislik — Yasal sayfa içerik modeli.
 *
 * KAYNAK: kullanıcının sağladığı `Petra_Yasal_Metinler.zip` (4 taslak +
 * `README.md`). Metinlerin hukuki anlamı DEĞİŞTİRİLMEDEN, yalnızca
 * yapısal olarak (başlık/paragraf/not) bu tipe bölündü — her `body`
 * alanı kaynak `.md` dosyasındaki ilgili paragrafın birebir metnidir.
 *
 * Köşeli parantezli alanlar (`[ONAYLI TİCARİ UNVAN]`, `[ONAYLI AÇIK
 * ADRES]`, `[ONAYLI E-POSTA]`, `[ONAYLI TELEFON]`, `[TARİH]` vb.)
 * paketin kendi README'sinde "Claude bunları tahmin etmemeli veya
 * uydurmamalıdır" diye açıkça belirtildiği için AYNEN korunmuştur — hiçbir
 * gerçek vergi no, MERSİS no, unvan, adres veya e-posta uydurulmadı.
 * Bu alanlar `petraContactInfo`'dan (lib/data/petra/site-config.ts) da
 * doldurulmadı, çünkü bir yasal metindeki "onaylı" ticari unvan/adres,
 * sitenin geri kalanında kullanılan pazarlama amaçlı iletişim bilgisiyle
 * aynı doğrulama düzeyinde değildir — kullanıcı bu belgeler için ayrı bir
 * onay istemiştir.
 */

export interface PetraLegalSection {
  /** Kaynak `.md`'deki "## N. Başlık" başlığı, numarası dahil. */
  heading: string;
  /**
   * Kaynak paragraf(lar)ı — birden fazla paragraf `\n\n` ile, bir
   * paragraf içindeki satır sonları (ör. iletişim bloğu) `\n` ile
   * ayrılmıştır. `**kalın**` işaretleme aynen korunur.
   */
  body: string;
}

export interface PetraLegalDocument {
  title: string;
  /** Kaynak dosyadaki "Son Güncelleme" değeri — onaylanana kadar `[TARİH]`. */
  lastUpdated: string;
  /** Numaralı bölümlerden önceki giriş paragrafı. */
  intro: string;
  /** Giriş paragrafının hemen altındaki uyarı notu (yalnızca Gizlilik Politikası'nda var). */
  noticeBeforeSections?: string;
  sections: PetraLegalSection[];
  /** Belgenin sonundaki uyarı notu (KVKK, Çerez, Kullanım Şartları). */
  noticeAfterSections?: string;
}
