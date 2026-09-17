# MB Website Engine — Project Context

## Canonical Repository
Local:
C:\Users\ozdog\Desktop\mbdigitalwepproject\MB-Website-Engine

GitHub:
https://github.com/mbdigitalboost-cell/mb-wepsite-engine.git

Branch:
main

Last verified HEAD:
cd14b442ea813832894ac494f28d56b6d6ecad94

## Repository Purpose
Bu repository birden fazla web sitesi projesinin bulunduğu ortak web-site engine'dir.

## Important Tenant
Taktikalp46

Store ID:
4bd25830-36df-406a-9828-8b1efcc83ea1

Customer ID:
16c92ffe-0745-42e0-87f0-6267ecd18705

## Central Platform Supabase
Project ref:
wnedgbbyqpvylfiwkwen

## Architecture Rule
Taktikalp46 ayrı Supabase projesi değildir.
Central Platform içindeki bir `stores` tenant'ıdır.

Petra farklı müşteri/site mimarisidir ve Taktikalp46 commerce koduyla karıştırılmamalıdır.

## Completed
- Central Platform tenant/security foundation
- E-commerce schema
- Types and validation
- Brands CRUD
- Categories CRUD
- Product CRUD
- Product image metadata CRUD
- Private product-images Storage
- Real product image upload
- MIME + magic-byte validation
- Canonical storage path validation
- Signed URL preview
- Storage + DB cleanup
- Production upload/delete smoke test PASS

## Current Phase
FAZ 2C-2 — Variant + Option + Optional Add-on / Extra Part System

## Important Product Configuration Requirement

ANA ÜRÜN:
Örneğin 1000 TL

VARIANT:
Renk / Beden gibi ürün varyasyonları.

OPTIONAL ADD-ON:
Örneğin:
Yan Cep +100 TL
Dergi Kılıfı +150 TL
Telsiz Aparatı +200 TL

Bir veya daha fazla ek parça seçildiğinde bunların fiyat farkı ana ürün fiyatına eklenmelidir.

Variant sistemi ile add-on sistemi birbirine karıştırılmamalıdır.

## Next Step
FAZ 2C-2 başlamadan önce mevcut variant/option/add-on altyapısının read-only audit'i yapılacaktır.

## Safety Rule
Migration / production write / commit / push / deploy işlemleri açık onay olmadan yapılmaz.

## Repository Confusion Warning

REKLAM PANELİ:
C:\Users\ozdog\Downloads\mb-digital-boost\mb-digital-boost

WEB ENGINE:
C:\Users\ozdog\Desktop\mbdigitalwepproject\MB-Website-Engine

Bu iki repository hiçbir zaman karıştırılmamalıdır.
