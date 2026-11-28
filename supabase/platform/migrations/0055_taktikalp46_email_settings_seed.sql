-- [taktikalp46] Faz 40 — Taktikalp46 mağazasının e-posta ayarı.
--
-- 0054'ten SONRA, kod yayınlanmadan ÖNCE uygulanır.
--   * gönderen: Taktikalp46 <siparis@t46store.com>  (t46store.com Resend'de doğrulandı)
--   * yanıt adresi: boş (yanıtlar gönderen adrese gider; Cloudflare Email Routing yönlendirir)
--   * yeni sipariş bildirimi: taktikalp46@gmail.com  (kullanıcı onayladı, 2026-11-28)
--   * dört tür anahtarı da açık
--
-- Satır zaten varsa DOKUNMAZ (on conflict do nothing): admin panelden yapılmış
-- bir değişikliğin üzerine yazmaz, yeniden çalıştırmak güvenlidir.
--
-- GERİ ALMA: delete from public.store_email_settings
--            where store_id = (select id from public.stores where slug = 'taktikalp46');
--            (satır silinince bu mağaza adına hiçbir e-posta gönderilmez)

insert into public.store_email_settings (
  store_id,
  from_name,
  from_email,
  reply_to_email,
  order_notification_emails,
  send_order_confirmation,
  send_shipped,
  send_cancel_refund,
  send_store_new_order
)
select
  s.id,
  'Taktikalp46',
  'siparis@t46store.com',
  null,
  array['taktikalp46@gmail.com'],
  true,
  true,
  true,
  true
from public.stores s
where s.slug = 'taktikalp46'
on conflict (store_id) do nothing;

-- Doğrulama (salt-okunur): tam olarak 1 satır dönmeli.
--   select t.from_name, t.from_email, t.reply_to_email, t.order_notification_emails,
--          t.send_order_confirmation, t.send_shipped, t.send_cancel_refund, t.send_store_new_order
--   from public.store_email_settings t join public.stores s on s.id = t.store_id where s.slug = 'taktikalp46';
