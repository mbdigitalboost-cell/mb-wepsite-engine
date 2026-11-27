#!/bin/bash
# [petra] Vercel "Ignored Build Step" betiği — petra-muhendislik projesi.
#
# Vercel'deki ayar (Settings → Git → Ignored Build Step):
#   bash scripts/vercel-ignore-build-petra.sh
# Vercel bu komutu HER dalın derlemesinden önce, o dalın kendi dosyalarıyla
# çalıştırır. Bu dosya o yüzden Petra dallarında (petra-production ve ondan
# açılan petra-* dalları) da bulunmak ZORUNDA: betik yoksa komut 127 ile
# biter ve Vercel derlemeyi atlamaz, HATA sayar ("errorStep: ignoreStep",
# 2026-11-27'de petra-seo push'unda görüldü). Dosya önceden yalnız main'de
# vardı; petra-production'a ilk kez bu commit'le geliyor.
#
# Vercel sözleşmesi: çıkış 0 → derleme ATLANIR, çıkış 1 → derleme YAPILIR.
#   - petra-production  → derle (Petra'nın canlı yayını yalnız bu daldan)
#   - diğer bütün dallar → atla (petra-seo gibi çalışma dalları, main vb.)
#
# VERCEL_GIT_COMMIT_REF'i Vercel verir (push edilen dalın adı). Mantık
# main'deki aynı adlı betikle aynıdır; Vercel ayarı DEĞİŞMEDİ.
if [ "$VERCEL_GIT_COMMIT_REF" != "petra-production" ]; then
  echo "Skipping build - branch is not petra-production"
  exit 0
else
  echo "Building - petra-production branch"
  exit 1
fi
