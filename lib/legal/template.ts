/**
 * Faz 33 — YASAL METİN ŞABLON MOTORU (saf; tests/legal-templates.test.ts).
 *
 * Söz dizimi (bilerek küçük):
 *   {{satici.unvan}}            değişken
 *   {{siparis.toplam|Sipariş sırasında belirlenir}}
 *                               değer boşsa "|" sonrası yazılır
 *   {{#if iade.kargo_firmasi}}  ... {{/if}}
 *                               (kendi satırlarında) blok yalnız değer
 *                               doluysa kalır; iç içe değil
 *
 * KURAL: varsayılanı olmayan bir değişken boşsa (ya da bilinmiyorsa) o
 * değişkenin geçtiği SATIR tamamen çıkar — canlıda asla "{{...}}",
 * "[DOLDURUN]" ya da yarım satır görünmez. Bilinmeyen değişken admin'de
 * yayımlamadan önce hata olarak gösterilir (validateLegalTemplate).
 */

export const LEGAL_VARIABLES: Record<string, string> = {
  "satici.unvan": "Satıcının ticari unvanı",
  "satici.yetkili": "İşletme sahibi / yetkili",
  "satici.vergi_no": "Vergi kimlik numarası",
  "satici.vergi_dairesi": "Vergi dairesi",
  "satici.mersis": "MERSİS numarası (yoksa satır çıkmaz)",
  "satici.adres": "Açık adres",
  "satici.telefon": "Telefon",
  "satici.eposta": "E-posta",
  "satici.kep": "KEP adresi (yoksa satır çıkmaz)",
  "satici.etbis": "ETBİS kayıt bilgisi (yoksa satır çıkmaz)",
  "satici.web": "Mağazanın internet adresi",
  "magaza.adi": "Mağaza adı",
  "odeme.yontemleri": "Mağazada açık ödeme yöntemleri",
  "odeme.kart": "Kartla (iyzico) ödeme açıksa dolu",
  "kargo.ucret": "Kargo ücreti (ücret yoksa boş)",
  "kargo.ucretsiz_esik": "Ücretsiz kargo sınırı (yoksa boş)",
  "kargo.esik_bazi": "Sınırın baktığı tutar (indirim öncesi/sonrası)",
  "kargo.kapida_odeme_ucreti": "Kapıda ödeme ek ücreti (0 ise boş)",
  "iade.sure_gun": "Cayma/iade süresi (gün, en az 14)",
  "iade.kargo_firmasi": "İade için anlaşmalı kargo firması",
  "iade.kod": "İade (anlaşma) kodu",
  "iade.talimat": "Mağazanın iade talimatı",
  "iade.adres": "İadenin gönderileceği adres",
  "iade.cevrimici": "Çevrimiçi iade talebi açıksa dolu",
  "iade.cevrimdisi": "Çevrimiçi iade talebi kapalıysa dolu",
  "siparis.no": "Sipariş numarası (yalnız sipariş anında)",
  "siparis.tarih": "Sipariş / onay tarihi",
  "siparis.urunler": "Ürün listesi (ad, seçenek, adet, tutar)",
  "siparis.ara_toplam": "Ürünler toplamı",
  "siparis.indirim": "İndirim tutarı (yoksa boş)",
  "siparis.indirim_kodu": "Kullanılan indirim kodu (yoksa boş)",
  "siparis.kargo": "Siparişin kargo ücreti (ücretsizse 'Ücretsiz')",
  "siparis.kapida_odeme_ucreti": "Siparişin kapıda ödeme ücreti (0 ise boş)",
  "siparis.toplam": "Tüm vergiler dahil toplam",
  "siparis.odeme_yontemi": "Seçilen ödeme yöntemi",
  "siparis.teslimat_adresi": "Teslimat adresi",
  "alici.ad": "Alıcının adı soyadı",
  "alici.telefon": "Alıcının telefonu",
  "alici.eposta": "Alıcının e-postası",
  "alici.fatura": "Fatura bilgisi (ad/unvan, adres)",
  "belge.tarih": "Metnin oluşturulduğu tarih",
  "cerez.ucuncu_taraf": "Analitik/reklam çerezleri bölümü (mağazanın takip ayarından üretilir)",
  "cerez.onay_cerezi": "Çerez tercihi çerezi kullanılıyorsa dolu (en az bir araç açık)",
};

export type LegalValues = Partial<Record<string, string | null | undefined>>;

const VARIABLE = /\{\{\s*([a-z_]+(?:\.[a-z_]+)*)\s*(?:\|([^}]*))?\}\}/g;
const IF_OPEN = /^\s*\{\{#if\s+([a-z_]+(?:\.[a-z_]+)*)\s*\}\}\s*$/;
const IF_CLOSE = /^\s*\{\{\/if\}\}\s*$/;

function present(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Şablonda geçen tüm değişken adları (koşullar dahil), tekrarsız. */
export function findTemplateVariables(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(VARIABLE)) names.add(match[1]);
  for (const line of body.split("\n")) {
    const open = IF_OPEN.exec(line);
    if (open) names.add(open[1]);
  }
  return [...names];
}

export interface TemplateValidation {
  unknownVariables: string[];
  /** Kapanmamış / fazladan {{/if}} ya da iç içe blok. */
  structureErrors: string[];
}

export function validateLegalTemplate(body: string): TemplateValidation {
  const unknownVariables = findTemplateVariables(body).filter((name) => !(name in LEGAL_VARIABLES));
  const structureErrors: string[] = [];
  let open: number | null = null;
  body.split("\n").forEach((line, index) => {
    if (IF_OPEN.test(line)) {
      if (open !== null) structureErrors.push(`${index + 1}. satır: iç içe {{#if}} desteklenmiyor.`);
      open = index;
    } else if (IF_CLOSE.test(line)) {
      if (open === null) structureErrors.push(`${index + 1}. satır: eşi olmayan {{/if}}.`);
      open = null;
    } else if (/\{\{[#/]/.test(line)) {
      structureErrors.push(`${index + 1}. satır: {{#if …}} ve {{/if}} kendi satırlarında olmalı.`);
    }
  });
  if (open !== null) structureErrors.push(`${(open as number) + 1}. satırdaki {{#if}} kapanmamış.`);
  return { unknownVariables, structureErrors };
}

/**
 * Şablonu doldurur. Bilinmeyen değişken boş sayılır (satır çıkar).
 * Çok satırlı değerler (ör. ürün listesi) olduğu gibi yerleşir.
 */
export function renderLegalTemplate(body: string, values: LegalValues): string {
  const value = (name: string) => (name in LEGAL_VARIABLES ? values[name] : undefined);
  const out: string[] = [];
  let skipping = false;
  let inBlock = false;

  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const open = IF_OPEN.exec(line);
    if (open) {
      inBlock = true;
      skipping = !present(value(open[1]));
      continue;
    }
    if (IF_CLOSE.test(line)) {
      inBlock = false;
      skipping = false;
      continue;
    }
    if (inBlock && skipping) continue;

    let dropLine = false;
    const rendered = line.replace(VARIABLE, (_whole, name: string, fallback: string | undefined) => {
      const v = value(name);
      if (present(v)) return v.trim();
      if (fallback !== undefined && fallback.trim() !== "") return fallback.trim();
      dropLine = true;
      return "";
    });
    if (!dropLine) out.push(rendered);
  }

  // Satır düşünce oluşan art arda boş satırları teke indir; baş/son boşlukları kırp.
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
