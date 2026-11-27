-- [taktikalp46] Faz 39 Adım 2.2–2.3 — Taktikalp46 mağazasının vitrin metinleri.
--
-- 0052'den SONRA, kod yayınlanmadan ÖNCE uygulanır. Metinler bugün canlıda
-- (www.t46store.com) görünen metinlerin BİREBİR aynısıdır; yeni metin yok:
--   * duyuru şeridi: "Güvenli Ödeme", "Kendi Ürettiğimiz Kydex Kalitesi"
--     (ücretsiz kargo ve iade maddeleri ayardan türetilir, burada yok)
--   * CTA bandı: başlık ve alt metin
--   * ürün sayfası rozeti: "Kendi Üretimimiz" / "Kydex işçiliği"
--
-- Satır zaten varsa DOKUNMAZ (on conflict do nothing): admin panelden yapılmış
-- bir değişikliğin üzerine yazmaz, yeniden çalıştırmak güvenlidir.
--
-- GERİ ALMA: delete from public.store_storefront_texts
--            where store_id = (select id from public.stores where slug = 'taktikalp46');

insert into public.store_storefront_texts (
  store_id,
  announcement_items,
  cta_band_title,
  cta_band_subtitle,
  own_production_title,
  own_production_subtitle
)
select
  s.id,
  array['Güvenli Ödeme', 'Kendi Ürettiğimiz Kydex Kalitesi'],
  'Her Kydex Parça Kendi Atölyemizde Isıyla Şekillendirilir.',
  'Kydex''in hassasiyeti. Sahaya hazır performans.',
  'Kendi Üretimimiz',
  'Kydex işçiliği'
from public.stores s
where s.slug = 'taktikalp46'
on conflict (store_id) do nothing;

-- Doğrulama (salt-okunur): tam olarak 1 satır dönmeli.
--   select t.announcement_items, t.cta_band_title, t.cta_band_subtitle, t.own_production_title, t.own_production_subtitle
--   from public.store_storefront_texts t join public.stores s on s.id = t.store_id where s.slug = 'taktikalp46';
