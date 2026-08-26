/**
 * Turkish display labels for `audit_logs.action` codes. Keep every action
 * string written anywhere in the app (customers/actions.ts,
 * websites/actions.ts, users/actions.ts) listed here — this is what turns
 * a raw action code into the "Website güncellendi" style text from the
 * Phase 4 dashboard mockup.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "customer.create": "Müşteri oluşturuldu",
  "customer.update": "Müşteri güncellendi",
  "customer.activate": "Müşteri aktifleştirildi",
  "customer.deactivate": "Müşteri pasifleştirildi",
  "website.create": "Website oluşturuldu",
  "website.update": "Website güncellendi",
  "website.activate": "Website aktifleştirildi",
  "website.deactivate": "Website pasifleştirildi",
  "user.invite": "Kullanıcı davet edildi",
  "user.role_change": "Kullanıcı rolü değiştirildi",

  // Phase 6 — Customer CMS content actions
  "site.update": "Site ayarları güncellendi",
  "hero.create": "Hero oluşturuldu",
  "hero.update": "Hero güncellendi",
  "hero.publish": "Hero yayınlandı",
  "service.create": "Hizmet oluşturuldu",
  "service.update": "Hizmet güncellendi",
  "service.publish": "Hizmet yayınlandı",
  "service.archive": "Hizmet arşivlendi",
  "solution.create": "Çözüm oluşturuldu",
  "solution.update": "Çözüm güncellendi",
  "solution.publish": "Çözüm yayınlandı",
  "solution.archive": "Çözüm arşivlendi",
  "project.create": "Proje oluşturuldu",
  "project.update": "Proje güncellendi",
  "project.publish": "Proje yayınlandı",
  "project.archive": "Proje arşivlendi",
  "campaign.create": "Kampanya oluşturuldu",
  "campaign.update": "Kampanya güncellendi",
  "campaign.publish": "Kampanya yayınlandı",
  "campaign.archive": "Kampanya arşivlendi",
  "testimonial.create": "Referans oluşturuldu",
  "testimonial.update": "Referans güncellendi",
  "testimonial.publish": "Referans yayınlandı",
  "testimonial.archive": "Referans arşivlendi",
  "faq.create": "SSS oluşturuldu",
  "faq.update": "SSS güncellendi",
  "faq.publish": "SSS yayınlandı",
  "faq.archive": "SSS arşivlendi",
  "media.upload": "Medya eklendi",
  "media.delete": "Medya silindi",
  "seo.update": "SEO güncellendi",
  "tracking.update": "Tracking ayarları güncellendi",
  "lead.status_change": "Talep durumu değiştirildi",

  // PHASE 2 — Commerce Admin: Stores + store-scoped submodules
  "store.create": "Mağaza oluşturuldu",
  "store.update": "Mağaza güncellendi",
  "store.activate": "Mağaza aktifleştirildi",
  "store.deactivate": "Mağaza pasifleştirildi",
  "store_profile.update": "Mağaza profili güncellendi",
  "store_settings.update": "Mağaza ayarları güncellendi",
  "store_settings.maintenance_enable": "Bakım modu açıldı",
  "store_settings.maintenance_disable": "Bakım modu kapatıldı",
  "store_settings.maintenance_reauth_failed": "Bakım modu değişikliği (şifre onayı başarısız)",
  "store_branding.update": "Mağaza marka/tema ayarları güncellendi",
  "navigation_menu.create": "Navigasyon menüsü oluşturuldu",
  "navigation_item.create": "Navigasyon öğesi oluşturuldu",
  "navigation_item.update": "Navigasyon öğesi güncellendi",
  "navigation_item.delete": "Navigasyon öğesi silindi",
  "navigation_item.reorder": "Navigasyon sıralaması güncellendi",
  "homepage_section.create": "Ana sayfa bölümü oluşturuldu",
  "homepage_section.update": "Ana sayfa bölümü güncellendi",
  "homepage_section.delete": "Ana sayfa bölümü silindi",
  "homepage_section.activate": "Ana sayfa bölümü aktifleştirildi",
  "homepage_section.deactivate": "Ana sayfa bölümü pasifleştirildi",
  "homepage_section.reorder": "Ana sayfa bölüm sıralaması güncellendi",
  "homepage_section_type.create": "Ana sayfa bölüm tipi oluşturuldu",
  "homepage_section_type.update": "Ana sayfa bölüm tipi güncellendi",
  "homepage_section_type.deactivate": "Ana sayfa bölüm tipi pasifleştirildi",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
