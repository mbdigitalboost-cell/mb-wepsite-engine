-- =============================================================================
-- PLATFORM MIGRATION 0037
-- customer_discounts.max_uses / min_order_amount — Faz 12 devamı, migration
-- 0036'nın (customer_discounts, commit 4aba009) doğrudan devamı.
--
-- Verified via list_migrations before writing this file: 0036 is the latest
-- applied migration, 0037 is unused. Re-verified immediately before
-- apply_migration itself runs (bu repo'nun standing disiplini).
--
-- KULLANIM SAYISI İÇİN AYRI BİR SAYAÇ KOLONU YOK — bilinçli karar (görevin
-- kendi talimatı): bir "usage_count" kolonu, her sipariş oluşturulduğunda
-- ayrıca artırılması/senkronize tutulması gereken İKİNCİ bir kaynak olurdu
-- (orders.applied_discount_id zaten birincil kaynak). Bunun yerine kullanım
-- sayısı HER ZAMAN `select count(*) from orders where applied_discount_id =
-- <id>` ile canlı hesaplanıyor (lib/commerce/discounts.ts ve admin Aboneler
-- sayfası — ikisi de AYNI sorguyu kullanıyor, iki farklı hesaplama yolu
-- yok). Bu, migration 0036'nın kendi "discount_amount ayrı bir sayaç değil,
-- ilgili orders satırlarından türetilir" felsefesiyle birebir tutarlı.
--
-- max_uses NULL = sınırsız (varsayılan davranış, mevcut satırlar etkilenmedi).
-- min_order_amount NULL = şart yok (aynı şekilde geriye dönük uyumlu).
-- =============================================================================

alter table public.customer_discounts
  add column max_uses integer check (max_uses > 0),
  add column min_order_amount numeric(12, 2) check (min_order_amount > 0);

comment on column public.customer_discounts.max_uses is
  'NULL = sınırsız kullanım. Kaç kez kullanıldığı burada TUTULMUYOR — orders.applied_discount_id = bu satırın id''si olan satırlar SAYILARAK hesaplanır (lib/commerce/discounts.ts''in resolveApplicableDiscount''ı ve admin Aboneler sayfası aynı sayımı paylaşır). Bkz. bu migration''ın kendi başlık yorumu.';

comment on column public.customer_discounts.min_order_amount is
  'NULL = şart yok. Set edildiğinde, sepet subtotal''i (indirim öncesi, server-side hesaplanan toplam) bu tutarın ALTINDAYSA indirim uygulanmaz.';
