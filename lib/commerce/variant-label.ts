/**
 * Faz 25 — varyant etiketleri için TEK kaynak (saf modül: sunucu + istemci).
 *
 * order_items.variant_label, sepet satırı ve admin ekranları aynı okunabilir
 * biçimi kullanır: seçenek DEĞERLERİ Türkçe baş harf büyük, birden çok grup
 * varsa " / " ile ("Coyote (Çöl)", "Siyah / L"). Önceden etiket
 * "renk: coyote (çöl)" biçimindeydi (grup adı + ham değer).
 */

function capitalizeWord(word: string): string {
  // "(çöl)" gibi parantezle başlayan kelimede ilk HARF büyütülür.
  const index = word.search(/\p{L}/u);
  if (index === -1) return word;
  return word.slice(0, index) + word.charAt(index).toLocaleUpperCase("tr") + word.slice(index + 1).toLocaleLowerCase("tr");
}

export function formatOptionValue(value: string): string {
  return value.trim().split(/\s+/).map(capitalizeWord).join(" ");
}

export function formatVariantLabel(values: string[]): string | null {
  const parts = values.map(formatOptionValue).filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : null;
}

const TR_ASCII: Record<string, string> = { ç: "C", ğ: "G", ı: "I", i: "I", ö: "O", ş: "S", ü: "U" };

/** "coyote (çöl)" → "COY", "siyah" → "SIY" — varyant SKU'sunun kısa eki (ürün SKU'su + "-" + ek). */
export function variantSkuSuffix(value: string): string {
  const ascii = value
    .toLocaleLowerCase("tr")
    .split("")
    .map((ch) => TR_ASCII[ch] ?? ch.toUpperCase())
    .join("")
    .replace(/[^A-Z0-9]/g, "");
  return ascii.slice(0, 3) || "VAR";
}

/** Bir seçenek kombinasyonunun sıradan bağımsız anahtarı (sıralı option_value id'leri). */
export function comboKey(valueIds: string[]): string {
  return [...valueIds].sort().join("_");
}
