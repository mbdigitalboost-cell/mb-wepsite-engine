# Platform Supabase — migration dosyaları

Bu klasördeki SQL dosyaları, MB Digital Boost'un **tek, merkezi** Supabase
projesinin ("Platform" projesi) şemasını oluşturur. Bu proje **hiçbir
müşterinin gerçek website içeriğini** (hero metni, çözümler, projeler vb.)
tutmaz — yalnızca "kim kime yetkili" bilgisini tutar: kullanıcılar,
müşteriler, web siteleri, kim hangi müşteriye erişebilir, kritik
işlemlerin kaydı.

Her müşterinin gerçek website içeriği kendi ayrı Supabase projesinde
olacak (bkz. gelecekteki `supabase/customer-template/` klasörü — henüz
oluşturulmadı, PHASE 5'te gelecek).

## Bu dosyalar şu an neyi yapıyor, neyi yapmıyor

**Yapıyor:** Bu 4 dosya, gerekli tabloları/kuralları tanımlayan SQL
kodunu içeriyor.

**Yapmıyor:** Bu dosyalar henüz **hiçbir gerçek Supabase projesine
uygulanmadı**. Çünkü şu an bağlı bir Platform Supabase projemiz yok
(`.env.local` boş). Bu dosyalar, siz Platform Supabase projesini
oluşturduğunuzda çalıştırılmak üzere hazır bekliyor.

## Sırası önemli

Dosyalar numaralandırılmış sırayla çalıştırılmalı, çünkü her biri bir
öncekine (`references`, fonksiyonlara) bağımlı:

1. `0001_profiles_customers_websites.sql` — kullanıcı profilleri, müşteri
   ve website tabloları
2. `0002_customer_users.sql` — kimin hangi müşteriye/role'e sahip olduğu
3. `0003_audit_logs.sql` — kritik işlemlerin kayıt tablosu
4. `0004_platform_rls.sql` — güvenlik kuralları (Row Level Security) ve
   yardımcı fonksiyonlar

## Ne zaman, nasıl uygulanacak

Platform Supabase projesini oluşturduğunuzda (siz karar verip
oluşturduğunuzda — bu adım kod değil, Supabase hesabınızdan manuel bir
işlem), bu 4 dosyayı **sırasıyla** o projenin SQL Editor'üne yapıştırıp
çalıştırmanız (veya Supabase CLI ile `supabase db push` yapmanız)
yeterli. Bu adımı birlikte, siz hazır olduğunuzda yapacağız — şimdilik
yalnızca dosyalar hazır.

## Kısa özet: ne kuruluyor

- **profiles** — her giriş yapan kullanıcı (admin veya müşteri) için bir
  satır. Otomatik oluşuyor (siz bir şey yapmıyorsunuz).
- **customers** — her MB Digital Boost müşterisi (örn. Petra Mühendislik)
  için bir satır.
- **websites** — her müşterinin web sitesi. Gerçek Supabase bağlantı
  bilgisi burada **tutulmuyor** — yalnızca `PETRA` gibi bir kimlik
  (`supabase_connection_key`) tutuluyor; gerçek bağlantı bilgisi yalnızca
  Vercel'in ortam değişkenlerinde olacak.
- **customer_users** — kimin hangi müşteriye ne rolde (admin/customer)
  bağlı olduğu. Admin satırları hiçbir müşteriye bağlı değildir (her şeyi
  görür); customer satırları tek bir müşteriye bağlıdır (yalnızca onu
  görür).
- **audit_logs** — "Bilal → Petra → Telefon bilgisini değiştirdi" gibi
  kritik işlemlerin kaydı.

Tüm tablolarda Row Level Security (RLS) açık — yani veritabanının
kendisi de "bu kullanıcı bunu görebilir mi" kuralını uyguluyor, yalnızca
uygulama koduna güvenilmiyor.
