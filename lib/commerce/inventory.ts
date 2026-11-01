/**
 * Admin Panel İşlevsellik devir metni — tek, paylaşımlı düşük stok eşiği.
 * Kısım B (Dashboard'un "düşük stok" sayısı) ve Kısım C (ürün listesinin
 * "Düşük Stok" filtresi) AYNI sabiti kullanır, iki yerde farklı sayı
 * riski olmasın. Devir metninin kendi doğrulanmış sorgusuyla (`track_
 * inventory=true and stock<=2`) birebir aynı eşik — admin ayarlarına
 * taşınabilir bir sabit olarak bırakıldı (devir metninin kendi "hardcode
 * değil en azından tek yerde tanımlı olsun" izniyle); bugün için ayrı
 * bir ayarlar alanı/migration yok.
 */
export const LOW_STOCK_THRESHOLD = 2;
