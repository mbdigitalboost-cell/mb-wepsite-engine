#!/bin/bash
# FAZ 11 — Petra izolasyon güçlendirme.
#
# Bu repo (mb-wepsite-engine) iki AYRI Vercel projesine bağlı:
# petra-muhendislik (Petra'nın canlı sitesi) ve mb-digital-boost-web-panel
# (paylaşımlı admin panel + tüm tenant storefront'ları — Taktikalp46 dahil).
# Petra'nın production'ı bugüne kadar sadece "Production Branch =
# petra-production" Vercel ayarına dayanıyordu — main'e yapılan her push
# petra-muhendislik projesinde de bir (production OLMAYAN, ama yine de
# gerçek bir build/deploy) çalıştırıyordu, kodda/repoda hiçbir yerde bunu
# belgeleyen/zorlayan bir şey yoktu.
#
# Bu script SADECE petra-muhendislik projesinin Vercel Dashboard → Settings
# → Git → "Ignored Build Step" alanına yapıştırılmak için yazıldı — commit
# edilmesi TEK BAŞINA hiçbir şeyi değiştirmez, Vercel projesinin kendi
# ayarına elle bağlanması gerekiyor (bkz. bu fazın kendi commit mesajı).
# ASLA mb-digital-boost-web-panel projesine uygulanmamalı — o proje her
# main push'unda gerçekten build almalı (admin panel + storefront'lar
# oradan servis ediliyor).
#
# Vercel'in kendi "Ignored Build Step" sözleşmesi: script exit code 0
# dönerse build ATLANIR, exit code 1 (veya sıfırdan farklı) dönerse build
# DEVAM EDER. $VERCEL_GIT_COMMIT_REF Vercel'in build ortamına kendisinin
# enjekte ettiği, bu push'un hangi Git dalından geldiğini söyleyen bir
# ortam değişkeni — burada KOD TARAFINDAN üretilen bir değer değil.
if [ "$VERCEL_GIT_COMMIT_REF" != "petra-production" ]; then
  echo "🛑 Skipping build - branch is not petra-production"
  exit 0
else
  echo "✅ Building - petra-production branch"
  exit 1
fi
