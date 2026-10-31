import Image from "next/image";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni — paylaşımlı,
 * tenant-bağımsız marka logosu/harf rozeti. Hem anasayfanın (Taktikalp46'ya
 * özel) "Silahını Seç köprüsü" bölümünde HEM /silahini-sec akışının
 * (genel/tenant-bağımsız) marka seçim ızgarasında kullanılıyor — iki ayrı
 * kopya yerine tek, paylaşımlı bileşen.
 *
 * `logoUrl` GERÇEK (brands.logo_url, admin "Markalar ve Modeller"
 * ekranından yüklenmiş) varsa onu gösterir; yoksa markanın baş
 * harfinden sade bir rozet — admin logo yükleyince OTOMATİK gerçek
 * logoya döner, uydurma bir görsel asla yok.
 */
export function BrandAvatar({ name, logoUrl, size = 48 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <span
        className="relative shrink-0 overflow-hidden rounded-[10px] border border-[#292929] bg-[#0A0A0A]"
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={name} fill unoptimized sizes={`${size}px`} className="object-contain p-1.5" />
      </span>
    );
  }
  return (
    <span
      className={`${storefrontDisplayClasses} flex shrink-0 items-center justify-center rounded-[10px] border border-[#292929] bg-[#0A0A0A] font-bold text-[#D95F00]`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toLocaleUpperCase("tr")}
    </span>
  );
}
