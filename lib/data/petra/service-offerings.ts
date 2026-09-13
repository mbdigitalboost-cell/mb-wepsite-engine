import type { PetraService } from "@/lib/data/petra/types";

/**
 * Faz D: concrete klima hizmet kategorileri, müşteri tarafından doğrudan
 * teyit edildi (2026-09-13) — `petraServices` (satış → keşif →
 * projelendirme → kurulum → teknik servis) ile KARIŞTIRILMAMALI: o dizi
 * Petra'nın genel SATIŞ SÜRECİNİ, bu dizi ise /hizmetler sayfasında ayrı
 * bir bölüm olarak gösterilen SOMUT hizmet kategorilerini temsil ediyor.
 * Açıklamalar bilinçli olarak GENEL tutuldu — garanti süresi, sertifika,
 * deneyim yılı veya teknik detay (ör. gaz tipi/basınç değeri) UYDURULMADI,
 * sadece hizmet adının doğal bir cümleyle açıklaması + mevcut teyitli
 * serviceArea ("Onikişubat, Kahramanmaraş") ile tutarlı bir bağlam.
 */
export const petraServiceOfferings: PetraService[] = [
  {
    title: "Klima Montajı ve Kurulumu",
    description: "Yeni klima sistemlerinizin ihtiyacınıza uygun kapasite ve konumda profesyonelce monte edilip devreye alınması.",
  },
  {
    title: "Arıza Tespiti ve Onarım (Tamir)",
    description: "Soğutmayan, ısıtmayan veya beklenmedik şekilde duran klimalarınızda arızanın tespiti ve onarımı.",
  },
  {
    title: "Klima Gaz Dolumu (Gaz Şarjı)",
    description: "Soğutma performansı düşen sistemlerde gaz seviyesinin kontrolü ve gerektiğinde gaz dolumu.",
  },
  {
    title: "Klima Deplasesi (Sökme ve Yeniden Takma)",
    description: "Taşınma veya yer değişikliği durumunda klimanızın güvenle sökülüp yeni konumuna yeniden monte edilmesi.",
  },
  {
    title: "Klima Temizliği",
    description: "İç ve dış ünitenin periyodik temizliğiyle klimanızın verimli ve hijyenik çalışmasının sağlanması.",
  },
];
