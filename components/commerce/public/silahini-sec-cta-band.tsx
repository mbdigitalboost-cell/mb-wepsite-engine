import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { Container } from "@/components/ui/container";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

/**
 * Faz 12 devamı (B) — "Silahını Seç" akışının 3 sayfasının da (marka/
 * model/sonuçlar) EN ALTINA eklenen, tam genişlikte turuncu bant.
 * Tenant-bağımsız/genel (bu akışın diğer parçalarıyla aynı gerekçe, bkz.
 * silahini-sec-progress.tsx'in doc comment'i) — kendi verisini
 * (store_profiles.social_links.instagram) kendi çözüyor, çağıran sayfalar
 * sadece storeId/storeSlug veriyor.
 *
 * RENK — sitede turuncunun İLK KEZ küçük bir vurgu değil, büyük bir blok
 * olarak kullanıldığı yer (görevin kendi talimatı): #B34C00→#D95F00 gradient
 * zemin (Faz 12 devamı — parlak #F26A00 ucu "çok göz alıcı" bulunduğu için
 * daha koyu/yumuşak bir tonla değiştirildi; marka turuncusu #D95F00 korundu,
 * SADECE parlak uç yumuşadı), üstünde koyu (#0A0A0A) metin. Kontrast kontrol
 * edildi (WCAG): #0A0A0A üzerine en koyu köşe (#B34C00) ~3.7:1 — büyük/kalın
 * başlık (h2) için AA eşiğini (3:1) rahatça geçiyor; küçük gövde metni
 * (subtext) için AA'nın (4.5:1) hemen altında ama 135deg gradient'in en koyu
 * ucu sadece bir köşede — ortalanmış metin pratikte daha açık bir tonun
 * üzerinde oturuyor. Bu marjı biraz daha güvenli tarafa çekmek için subtext
 * artık /80 opaklık DEĞİL, tam #0A0A0A (aşağıda).
 *
 * METİN — başlık görevin kendi verdiği örnek metin (kaldırılan "Formdan
 * Ekipmana" bölümünün doğrulanmış süreç bilgisine dayanıyor, filigranlı
 * görsel olmadan). Alt metin YENİ bir iddia/istatistik DEĞİL — Faz 7.3'ün
 * hero'sunda zaten onaylanmış AYNI cümle ("Kydex'in hassasiyeti. Sahaya
 * hazır performans.") burada tekrar kullanılıyor.
 *
 * CTA HEDEFİ — store_profiles.social_links.instagram doluysa (Taktikalp46
 * için Faz 7.3'te zaten dolduruldu: https://www.instagram.com/taktikalp46)
 * ORAYA, yoksa /silahini-sec'e (diğer markalara göz at) yönlendirir. Bu
 * karar HER SAYFA YÜKLEMESİNDE canlı DB satırından okunuyor, hardcoded
 * değil — profil sonradan değişirse/silinirse bant otomatik /silahini-sec'e
 * döner.
 */
export async function SilahiniSecCtaBand({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const profile = await getPublicStoreProfile(storeId);
  const instagramUrl =
    typeof profile?.socialLinks.instagram === "string" && profile.socialLinks.instagram.trim().length > 0
      ? profile.socialLinks.instagram
      : null;

  const ctaClassName = `${spaceGrotesk.className} inline-flex h-12 items-center justify-center rounded-md border-2 border-[#0A0A0A] bg-[#0A0A0A] px-7 text-sm font-semibold text-[#D95F00] transition-colors hover:bg-transparent hover:text-[#0A0A0A]`;

  return (
    <div style={{ background: "linear-gradient(135deg, #B34C00 0%, #D95F00 100%)" }}>
      <Container className="flex flex-col items-center gap-4 py-14 text-center">
        <h2 className={`${spaceGrotesk.className} max-w-2xl text-2xl font-bold uppercase leading-tight text-[#0A0A0A] sm:text-3xl`}>
          Her Kydex Parça Kendi Atölyemizde Isıyla Şekillendirilir.
        </h2>
        <p className="max-w-lg text-sm text-[#0A0A0A]">Kydex&apos;in hassasiyeti. Sahaya hazır performans.</p>
        {instagramUrl ? (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={ctaClassName}>
            Bizi Instagram&apos;da Takip Et →
          </a>
        ) : (
          <Link href={`/store/${storeSlug}/silahini-sec`} className={ctaClassName}>
            Diğer Markalara Göz At →
          </Link>
        )}
      </Container>
    </div>
  );
}
