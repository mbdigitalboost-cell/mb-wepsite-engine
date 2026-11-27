/**
 * Faz 38 — SAHİPLİK HARİTASI: repodaki her dosya ya ortak motora ("shared")
 * ya da TEK bir siteye aittir. Kullananlar:
 *   - scripts/check-isolation.mjs  (site dosyasında başka sitenin izi / importu)
 *   - scripts/check-branch-scope.mjs + .githooks/pre-push (bir commit iki
 *     sitenin dosyasına dokunamaz; Petra dalına Petra dışı dosya giremez;
 *     main'e Petra dosyası giremez)
 * Kurallar: SITE_IZOLASYON.md §2.
 *
 * Saf TS (import yok): scripts/*.mjs ve testler doğrudan çalıştırır.
 *
 * NASIL OKUNUR — `OWNERSHIP_RULES` yukarıdan aşağı taranır, İLK eşleşen
 * kural kazanır; hiçbiri eşleşmezse dosya "shared"dir. Yol ayracı "/",
 * yollar repo köküne görelidir. Kalıp: "**" her şey (alt klasörler dahil),
 * "*" tek yol parçası içinde her şey.
 *
 * NASIL ÇIKARILDI (2026-11-27, main 9592846) — tahminle değil, import
 * grafiği taranarak. Dört kanıt düzeyi var, her kuralın `basis` alanında yazar:
 *   "name"      Yol/ad siteyi açıkça söylüyor (klasör ya da dosya adı).
 *   "wired"     Dosyaya yalnız o sitenin sayfalarından ulaşılıyor VE dosya
 *               o sitenin veri modülünü doğrudan import ediyor.
 *   "feature"   Özellik yalnız o sitede var (aşağıda gerekçesiyle).
 *   "exclusive" Dosyayı YALNIZ o site kullanıyor: mağaza, panel, API ve kök
 *               sayfalardan o sitenin dosyalarından geçmeden ulaşılamıyor
 *               (kullanıcı kararı, 2026-11-28: "yalnız Petra'nın kullandığı
 *               dosyalar petra olsun; main'de bunlara dokunmak da reddedilsin").
 *               Başka bir site bu dosyalardan birine ihtiyaç duyarsa önce
 *               dosya ortak motora taşınır ([shared] commit), sonra kullanılır.
 *
 * YENİ SİTE — dosyaları app/sites/<key>/**, lib/sites/<key>/**,
 * public/sites/<key>/** altına konur; bu üç kalıp aşağıda otomatik olarak
 * <key> sahibine eşlenir, haritaya satır eklemek gerekmez. Site klasörü
 * dışındaki site-özel dosyalar (migration, seed vb.) buraya satır olarak yazılır.
 */

export const SHARED_OWNER = "shared";

/** "shared" ya da bir site anahtarı (lib/sites/registry.ts → SITES[].key). */
export type Owner = string;

export interface OwnershipRule {
  pattern: string;
  owner: Owner;
  basis: "name" | "wired" | "feature" | "exclusive";
  note?: string;
}

export const OWNERSHIP_RULES: readonly OwnershipRule[] = [
  // ───────────── Petra Mühendislik (kurumsal; canlısı petra-production dalından) ─────────────
  { pattern: "app/(public)/**", owner: "petra", basis: "name", note: "Petra'nın kökteki public sitesi (SITE_IZOLASYON.md §2.3)." },
  { pattern: "lib/data/petra/**", owner: "petra", basis: "name" },
  { pattern: "lib/cms/petra/**", owner: "petra", basis: "name" },
  { pattern: "components/sites/petra/**", owner: "petra", basis: "name" },
  { pattern: "public/images/petra/**", owner: "petra", basis: "name" },
  { pattern: "public/fonts/petra/**", owner: "petra", basis: "name" },
  { pattern: "public/videos/petra/**", owner: "petra", basis: "name" },
  { pattern: "tests/petra/**", owner: "petra", basis: "name" },
  { pattern: "scripts/vercel-ignore-build-petra.sh", owner: "petra", basis: "name" },
  { pattern: "supabase/customer-template/seed/petra.sql", owner: "petra", basis: "name", note: "Petra'nın kendi Supabase'i için içerik seed'i." },
  { pattern: "**/petra-*", owner: "petra", basis: "name", note: "petra-theme.ts, petra-sitemap.ts, petra-share-image.ts, petra-fonts.css …" },
  {
    pattern: "components/sections/**",
    owner: "petra",
    basis: "wired",
    note: "Petra ana sayfa/hakkımızda/referans bölümleri; 27/30 dosya lib/data/petra'yı doğrudan import ediyor, hepsine yalnız app/(public)'ten ulaşılıyor.",
  },
  { pattern: "components/forms/discovery-request-form.tsx", owner: "petra", basis: "wired" },
  { pattern: "components/legal/legal-document.tsx", owner: "petra", basis: "wired" },
  { pattern: "components/ui/site-work-lightbox.tsx", owner: "petra", basis: "wired" },
  { pattern: "lib/seo/build-metadata.ts", owner: "petra", basis: "wired", note: "Petra site adını ve Petra CMS anahtarını doğrudan kullanır." },
  { pattern: "lib/seo/structured-data.ts", owner: "petra", basis: "wired" },
  {
    pattern: "components/btu/**",
    owner: "petra",
    basis: "feature",
    note: "BTU hesaplayıcı yalnız Petra'nın /btu-hesaplama sayfasında var; Petra dalındaki SEO işi bu klasöre dosya ekliyor.",
  },
  { pattern: "lib/btu/**", owner: "petra", basis: "feature" },
  { pattern: "lib/validation/btu.ts", owner: "petra", basis: "feature" },
  // Yalnız Petra'nın kullandığı dosyalar ("exclusive"): header/footer/menü, bölüm
  // yardımcıları, müşteri-CMS bağdaştırıcıları, keşif formu ve API'si.
  { pattern: "components/layout/site-header.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/layout/site-footer.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/layout/page-header.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/navigation/desktop-nav.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/navigation/mobile-nav.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/navigation/mobile-sticky-cta.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/navigation/floating-whatsapp-button.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/decorative/**", owner: "petra", basis: "exclusive" },
  { pattern: "components/legal/**", owner: "petra", basis: "exclusive", note: "legal-placeholder.tsx hiçbir sayfadan kullanılmıyor (ölü kod), Petra iletişim bilgisini import ediyor." },
  { pattern: "components/ui/count-up.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/ui/empty-state.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/ui/logo.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/ui/reveal.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "components/ui/section-divider.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "lib/cms/adapters/**", owner: "petra", basis: "exclusive", note: "connectionKey ile genel yazılmış müşteri-CMS okuyucuları; bugün tek kullanıcısı Petra." },
  { pattern: "lib/design-system/**", owner: "petra", basis: "exclusive" },
  { pattern: "lib/motion/**", owner: "petra", basis: "exclusive" },
  { pattern: "lib/tracking/tracking-scripts.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "lib/utils/render-legal-text.tsx", owner: "petra", basis: "exclusive" },
  { pattern: "lib/validation/discovery-request.ts", owner: "petra", basis: "exclusive" },
  { pattern: "app/api/forms/discovery-request/**", owner: "petra", basis: "exclusive", note: "route-policy: bu API yalnız Petra sitesinde açık." },
  { pattern: "lib/leads/**", owner: "petra", basis: "exclusive", note: "Keşif talebini Petra'nın veritabanına yazar; tek çağıranı yukarıdaki API." },
  { pattern: "lib/notifications/send-lead-notification.ts", owner: "petra", basis: "exclusive" },

  // ───────────── Taktikalp46 (mağaza) ─────────────
  { pattern: "components/commerce/public/taktikalp46-*", owner: "taktikalp46", basis: "name" },
  { pattern: "public/images/taktikalp46/**", owner: "taktikalp46", basis: "name" },
  { pattern: "public/images/hero/kydex-*", owner: "taktikalp46", basis: "name", note: "Taktikalp ana sayfa hero görseli." },
  {
    pattern: "public/images/categories/**",
    owner: "taktikalp46",
    basis: "feature",
    note: "Taktikalp'in kategori adlarıyla (kılıf, palaska …) adlandırılmış yedek kategori görselleri.",
  },
  { pattern: "lib/fonts/store/**", owner: "taktikalp46", basis: "feature", note: "Taktikalp mağaza tasarımının font dosyaları (Faz 38 devri)." },
  { pattern: "supabase/platform/migrations/*taktikalp46*", owner: "taktikalp46", basis: "name", note: "Taktikalp'e özel katalog seed'leri." },
  {
    pattern: "supabase/platform/migrations/0049_legal_document_seed.sql",
    owner: "taktikalp46",
    basis: "feature",
    note: "Yalnız Taktikalp mağazasının yasal metinlerini tohumlar (her ifade `where s.slug = 'taktikalp46'`).",
  },

  // ───────────── Panel (MB Digital Boost admin) ─────────────
  { pattern: "app/dashboard/**", owner: "panel", basis: "name" },
  { pattern: "app/(auth)/**", owner: "panel", basis: "name", note: "Panel girişi ve MFA." },
  { pattern: "app/auth/**", owner: "panel", basis: "name", note: "Panel davet/şifre belirleme." },
  { pattern: "components/dashboard/**", owner: "panel", basis: "name" },
];

/** Her dalda (Petra dalları dahil) değişmesine izin verilen ortak kural dokümanları. */
export const ALWAYS_ALLOWED_DOC_FILES: readonly string[] = ["CLAUDE.md", "SITE_IZOLASYON.md"];

/** Yeni siteler: app/sites/<key>/**, lib/sites/<key>/**, public/sites/<key>/** → <key>. */
const SITE_FOLDER_PATTERN = /^(?:app|lib|public)\/sites\/([^/]+)\/.+/;

function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        // "**/" → sıfır ya da daha çok klasör; sondaki "**" → kalan her şey.
        if (pattern[i + 2] === "/") {
          source += "(?:.*/)?";
          i += 2;
        } else {
          source += ".*";
          i += 1;
        }
      } else {
        source += "[^/]*";
      }
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

const compiledRules = OWNERSHIP_RULES.map((rule) => ({ rule, regex: globToRegExp(rule.pattern) }));

export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Dosyanın eşleştiği kural (yoksa null → "shared"). */
export function ownershipRuleOf(path: string): OwnershipRule | null {
  const normalized = normalizeRepoPath(path);
  return compiledRules.find((entry) => entry.regex.test(normalized))?.rule ?? null;
}

/** Dosyanın sahibi: "shared" ya da site anahtarı. */
export function ownerOf(path: string): Owner {
  const normalized = normalizeRepoPath(path);
  const rule = ownershipRuleOf(normalized);
  if (rule) return rule.owner;
  const siteFolder = SITE_FOLDER_PATTERN.exec(normalized);
  return siteFolder ? siteFolder[1] : SHARED_OWNER;
}

export function isSharedOwner(owner: Owner): boolean {
  return owner === SHARED_OWNER;
}
