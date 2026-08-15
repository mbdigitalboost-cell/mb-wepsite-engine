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
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
