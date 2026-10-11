/**
 * Site geneli tasarım sistemi (Taktikalp46 storefront) — ARTIK merkezi bir
 * nokta. Önceden her sayfa kendi `const spaceGrotesk = Space_Grotesk(...)`/
 * `const inter = Inter(...)` çağrısını yapıyordu (next/font/google tek tek
 * ~15+ dosyada tekrarlanmıştı — grep ile doğrulandı, "merkezi bir yerde
 * tanımlı" VARSAYIMI yanlış çıktı). Gerçek font YÜKLEME hâlâ next/font/
 * google'ın kendi kısıtı yüzünden TEK bir dosyada olmak zorunda
 * (app/store/[storeSlug]/layout.tsx — route ağacının tek paylaşımlı
 * noktası), ama o yükleme artık sadece CSS değişkeni (`variable` seçeneği)
 * üretiyor, her sayfanın kendi `next/font/google` çağrısı YOK. Bu dosya o
 * değişkenlere (globals.css'in `@theme inline` bloğunda --font-store-display/
 * --font-store-body/--font-store-mono -> font-store-display/font-store-body/
 * font-store-mono Tailwind utility'lerine dönüşüyor, admin panelin
 * --font-brand-* tokenlarıyla AYNI desen) işaret eden, tekrar kullanılabilir
 * className string'leri sağlıyor — her dosya artık SADECE bunu import
 * ediyor, kendi font nesnesini yaratmıyor.
 *
 * Gövde metni (Barlow) layout.tsx'teki wrapper'ın kendi varsayılan font'u
 * olduğu için ayrı bir "body" class'ı GEREKMİYOR — hiçbir className
 * vermeyen düz metin zaten Barlow ile render olur.
 */
export const storefrontDisplayClasses = "font-store-display uppercase tracking-wide";

export const storefrontMonoClasses = "font-store-mono tracking-wide";
