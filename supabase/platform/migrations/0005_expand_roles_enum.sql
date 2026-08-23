-- =============================================================================
-- PLATFORM MIGRATION 0005
-- Expand app_role enum — VALUES ONLY (see 0006 for how they're used)
--
-- KRİTİK, EMPİRİK OLARAK DOĞRULANMIŞ DÜZELTME (bu dosya önceden 0006'daki
-- her şeyle BİRLİKTE, tek bir migration'daydı — "0005_expand_roles.sql").
-- O sürüm, bu oturumda canlı Supabase projesine karşı GÜVENLİ bir
-- ROLLBACK'li transaction içinde test edilirken şu hatayla PATLADI:
--
--   ERROR: 55P04: unsafe use of new value "platform_admin" of enum type app_role
--   HINT: New enum values must be committed before they can be used.
--
-- Bu, PostgreSQL'in KOŞULSUZ bir kısıtlaması: `ALTER TYPE ... ADD VALUE`
-- ile eklenen bir enum değeri, o değeri ekleyen transaction TAMAMEN
-- commit olmadan aynı transaction (hatta sonraki bir komutunda bile)
-- içinde KULLANILAMAZ — "PostgreSQL 12+'te aynı transaction'da daha
-- sonra kullanılabilir" şeklindeki önceki varsayımım YANLIŞTI, canlı
-- veritabanına karşı test edilerek düzeltildi.
--
-- Çözüm: enum'a değer EKLEMEK (bu dosya) ile o değerleri KULLANMAK
-- (0006_expand_roles_rbac.sql — UPDATE, CHECK constraint, index'ler,
-- fonksiyonlar) artık İKİ AYRI migration dosyasına bölündü. Supabase'in
-- migration mekanizması (CLI `supabase migration up`, ya da SQL
-- Editor'de dosyaları sırayla çalıştırmak) her dosyayı kendi
-- transaction'ında commit ettiği için, 0005 commit olduktan SONRA 0006
-- çalıştığında yeni değerler artık "eski/commit edilmiş" sayılır ve
-- sorunsuz kullanılabilir. Bu iki dosya MUTLAKA SIRAYLA ve AYRI AYRI
-- uygulanmalı — asla tek bir elle yazılmış transaction'da birleştirilip
-- çalıştırılmamalı.
--
-- Bu dosyanın kendisi zararsız/geri dönüşü sınırlı bir şekilde geri
-- alınamaz: Postgres bir enum'dan değer SİLMEYİ desteklemez. Ama sadece
-- yeni etiketler EKLEMEK — hiçbir satırda KULLANILMADAN önce — hiçbir
-- mevcut davranışı değiştirmez, tamamen izole ve güvenli bir adımdır.
-- =============================================================================

alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'platform_admin';
alter type public.app_role add value if not exists 'store_admin';
alter type public.app_role add value if not exists 'store_editor';
alter type public.app_role add value if not exists 'store_viewer';
