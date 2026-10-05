/**
 * Faz 12 devamı — ürün yapılandırıcısındaki (ProductConfigurator) renk
 * pillerine küçük bir renk noktası eklemek için, yaygın Türkçe renk
 * isimlerinden gerçek hex değerlere bir lookup. Taktik ekipman katalogunda
 * sık görülen tonlar (coyote, çöl, haki) dahil. TANINMAYAN bir isim
 * (`getColorSwatch` null döner) için ProductConfigurator noktasız, sade bir
 * pil gösteriyor — uydurma/tahmini bir renk ASLA atanmıyor.
 *
 * Bu lookup sadece GÖRSEL bir ipucu — hangi option group'un "renk" olduğunu
 * bilmiyoruz (ör. "Beden"/"Boy" gibi başka gruplar da olabilir), bu yüzden
 * ProductConfigurator HER option değeri için çağırıyor; bir beden değeri
 * ("Küçük", "Orta") zaten sözlükte yok, sessizce noktasız kalıyor — yanlış
 * bir eşleşme riski yok.
 */
export const COLOR_SWATCH_MAP: Record<string, string> = {
  siyah: "#1A1A1A",
  beyaz: "#F5F5F5",
  gri: "#808080",
  "koyu gri": "#4A4A4A",
  "açık gri": "#B0B0B0",
  kahverengi: "#6B4423",
  bej: "#D9C7A7",
  haki: "#6B6B47",
  coyote: "#81613C",
  çöl: "#C2B280",
  "çöl bej": "#C2B280",
  yeşil: "#3C6E47",
  "koyu yeşil": "#2F4F3A",
  zeytin: "#5A5A35",
  kırmızı: "#B33A2E",
  bordo: "#6E1E24",
  mavi: "#2C5F8A",
  lacivert: "#1B2A4A",
  sarı: "#D4AC0D",
  turuncu: "#D95F00",
  mor: "#6C3483",
  pembe: "#D98880",
  altın: "#B8860B",
  gümüş: "#C0C0C0",
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("tr");
}

/**
 * Önce tam eşleşme, sonra "Coyote Kahve" gibi birleşik isimler için
 * kelime-kelime eşleşme dener (boşluk/"-"/"/" ile ayrılmış). Hiçbiri
 * eşleşmezse null — uydurma bir renk ASLA döndürülmez.
 */
export function getColorSwatch(value: string): string | null {
  const normalized = normalize(value);
  if (COLOR_SWATCH_MAP[normalized]) return COLOR_SWATCH_MAP[normalized];

  const words = normalized.split(/[\s/-]+/).filter(Boolean);
  for (const word of words) {
    if (COLOR_SWATCH_MAP[word]) return COLOR_SWATCH_MAP[word];
  }

  return null;
}
