import type { PetraLegalDocument } from "@/lib/data/petra/legal/types";

/** Kaynak: Petra_Yasal_Metinler.zip / 03_Cerez_Politikasi.md — birebir. */
export const petraCerezPolitikasi: PetraLegalDocument = {
  title: "Çerez Politikası",
  lastUpdated: "20.08.2026",
  intro:
    "Petra Mühendislik web sitesinde; sitenin çalışmasını sağlamak, güvenliği desteklemek, tercihleri hatırlamak ve gerekli durumlarda kullanım analizleri yapmak amacıyla çerezler ve benzeri teknolojiler kullanılabilir.",
  sections: [
    {
      heading: "1. Çerez Nedir?",
      body: "Çerezler, internet siteleri tarafından tarayıcı aracılığıyla cihazda saklanabilen küçük veri dosyalarıdır.",
    },
    {
      heading: "2. Çerez Türleri",
      body: "**Zorunlu Çerezler**\nWeb sitesinin temel işlevleri ve güvenliği için gerekli olabilir.\n\n**İşlevsel Çerezler**\nKullanıcı tercihlerini veya belirli ayarları hatırlamak için kullanılabilir.\n\n**Analitik Çerezler**\nSite kullanımını ve performansını anlamaya, hizmetleri geliştirmeye yardımcı olabilir.\n\n**Pazarlama Çerezleri**\nKullanılması halinde reklam ölçümü ve kampanya performansı gibi amaçlarla kullanılabilir. Bu tür teknolojiler ilgili hukuki gereklilikler ve kullanıcı tercihleri dikkate alınarak yönetilir.",
    },
    {
      heading: "3. Üçüncü Taraf Servisler",
      body: "Kullanılan teknik altyapıya bağlı olarak üçüncü taraf hizmet sağlayıcıları çerez veya benzeri teknolojiler kullanabilir. Production'da kullanılan gerçek servisler ayrıca listelenmelidir.",
    },
    {
      heading: "4. Tercihler",
      body: "Tarayıcı ayarlarınızdan çerezleri engelleyebilir veya silebilirsiniz. Zorunlu çerezlerin engellenmesi bazı site fonksiyonlarının çalışmamasına yol açabilir.",
    },
    {
      heading: "5. Saklama",
      body: "Saklama süresi çerezin türüne ve amacına göre değişir. Oturum çerezleri oturum sonunda silinebilir; kalıcı çerezler belirli sürelerle tutulabilir.",
    },
    {
      heading: "6. İletişim",
      body: "**Petra Mühendislik**\nE-posta: servispetraklima@gmail.com\nTelefon: 0535 791 11 96",
    },
  ],
  noticeAfterSections: "Yayına almadan önce kullanılan tüm gerçek çerez ve üçüncü taraf servisler teknik olarak doğrulanmalıdır.",
};
