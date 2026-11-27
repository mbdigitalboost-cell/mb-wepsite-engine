// Faz 38 — Vercel "Ignored Build Step": her proje YALNIZ kendi sitesinin
// dallarını derlesin. Karar: lib/sites/build-scope.ts.
//
// Vercel sözleşmesi: çıkış 0 → derleme ATLANIR, çıkış 1 → derleme YAPILIR.
//
// VERCEL AYARI (Settings → Git → Ignored Build Step) — bu betiği bağlamak
// Cowork'ün işidir, kullanıcı onayıyla; kod Vercel ayarını değiştirmez:
//
//   [ -f scripts/vercel-should-build.mjs ] || exit 0; node scripts/vercel-should-build.mjs
//
// Baştaki dosya denetimi ŞART: Vercel komutu derlenen dalın KENDİ dosyalarıyla
// çalıştırır. Betiğin olmadığı bir dalda (ör. petra-production soyundaki bir
// dal, mağaza projesinde) çıplak `node …` 1'den farklı bir hatayla biter ve
// Vercel bunu "atla" değil HATALI deployment sayar (2026-11-27'de Petra
// projesinde aynen yaşandı). Betiği olmayan dal bu projenin dalı değildir → atla.
//
// Derlemeden ve `npm install`'dan ÖNCE çalışır: yalnız Node'un kendi
// modüllerini ve saf TS dosyalarını kullanır (Node 24 türleri kendisi ayıklar).
// Petra projesinin mevcut ayarı (scripts/vercel-ignore-build-petra.sh) ayrıdır
// ve bu betikle değişmez.
import { shouldBuild } from "../lib/sites/build-scope.ts";

const decision = shouldBuild({ siteKey: process.env.SITE_KEY, ref: process.env.VERCEL_GIT_COMMIT_REF });
console.log(`[vercel-should-build] SITE_KEY=${process.env.SITE_KEY ?? "(yok)"} dal=${process.env.VERCEL_GIT_COMMIT_REF ?? "(yok)"} → ${decision.build ? "DERLE" : "ATLA"}: ${decision.reason}`);
process.exit(decision.build ? 1 : 0);
