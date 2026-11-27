// Petra SEO iyileştirme — sayfa düzeyi doğrulama (ÇALIŞAN bir sunucuya karşı).
//
//   next build && next start            (NEXT_PUBLIC_SITE_URL=https://www.petramuhendislik.com ile)
//   PETRA_TEST_BASE_URL=http://localhost:3000 node --test tests/petra/seo-pages.test.mjs
//
// PETRA_TEST_BASE_URL yoksa testler atlanır. Yalnız GET yapar; hiçbir şeye yazmaz.
// Canlıya karşı da çalıştırılabilir (PETRA_TEST_BASE_URL=https://www.petramuhendislik.com).
//
// PETRA_TEST_CMS=1: sunucu Petra CMS'ine bağlıysa (canlı / Vercel) verin. O
// zaman CMS'ten gelen başlık-açıklamalar (ana sayfa, Hakkımızda) sabit
// metinle karşılaştırılmaz; koddan gelen 11 açıklama yine birebir aranır.
import assert from "node:assert/strict";
import { test } from "node:test";
import { petraSolutionSeoDescriptions, petraStaticPageSeoDescriptions } from "../../lib/data/petra/seo-descriptions.ts";

const BASE = (process.env.PETRA_TEST_BASE_URL ?? "").replace(/\/+$/, "");
const SITE = (process.env.PETRA_TEST_SITE_URL ?? "https://www.petramuhendislik.com").replace(/\/+$/, "");
const skip = BASE ? false : "PETRA_TEST_BASE_URL verilmedi";

const SOLUTION_SLUGS = Object.keys(petraSolutionSeoDescriptions);
const PAGES = [
  "/",
  "/hakkimizda",
  "/cozumler",
  "/hizmetler",
  "/projeler",
  "/kampanyalar",
  "/referanslar",
  "/iletisim",
  "/btu-hesaplama",
  ...SOLUTION_SLUGS.map((slug) => `/cozumler/${slug}`),
  "/kvkk-aydinlatma-metni",
  "/gizlilik-politikasi",
  "/cerez-politikasi",
  "/kullanim-sartlari",
];

const EXPECTED_DESCRIPTIONS = {
  ...Object.fromEntries(SOLUTION_SLUGS.map((slug) => [`/cozumler/${slug}`, petraSolutionSeoDescriptions[slug]])),
  ...Object.fromEntries(Object.entries(petraStaticPageSeoDescriptions).map(([key, text]) => [`/${key}`, text])),
};

function decode(value) {
  return value
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function meta(html, attribute, name) {
  const tag = html.match(new RegExp(`<meta[^>]*${attribute}="${name}"[^>]*>`));
  const content = tag?.[0].match(/content="([^"]*)"/);
  return content ? decode(content[1]) : null;
}

const cache = new Map();
async function page(path) {
  if (!cache.has(path)) {
    const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
    cache.set(path, { status: response.status, html: await response.text() });
  }
  return cache.get(path);
}

test("19 sayfa 200 döner; başlık, açıklama ve canonical var", { skip }, async () => {
  assert.equal(PAGES.length, 19);
  for (const path of PAGES) {
    const { status, html } = await page(path);
    assert.equal(status, 200, path);
    assert.match(html, /<title>[^<]+<\/title>/, `${path}: title`);
    assert.ok(meta(html, "name", "description"), `${path}: description`);
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    assert.ok(canonical?.startsWith(`${SITE}/`) || canonical === SITE, `${path}: canonical ${canonical}`);
  }
});

test("11 sayfanın açıklaması tablodakiyle birebir; og ve twitter açıklaması aynı metin", { skip }, async () => {
  assert.equal(Object.keys(EXPECTED_DESCRIPTIONS).length, 11);
  for (const [path, expected] of Object.entries(EXPECTED_DESCRIPTIONS)) {
    const { html } = await page(path);
    assert.equal(meta(html, "name", "description"), expected, `${path}: description`);
    assert.equal(meta(html, "property", "og:description"), expected, `${path}: og:description`);
    assert.equal(meta(html, "name", "twitter:description"), expected, `${path}: twitter:description`);
  }
});

test("her sayfada mutlak og:image, boyutları ve büyük twitter kartı var; görsel açılıyor", { skip }, async () => {
  for (const path of PAGES) {
    const { html } = await page(path);
    const image = meta(html, "property", "og:image");
    assert.ok(image, `${path}: og:image yok`);
    assert.match(image, /^https:\/\//, `${path}: og:image mutlak değil (${image})`);
    assert.equal(meta(html, "name", "twitter:card"), "summary_large_image", `${path}: twitter:card`);
    assert.equal(meta(html, "name", "twitter:image"), image, `${path}: twitter:image`);

    // Varsayılan (Petra alan adından üretilen) görsel: adresi sayfayla eşleşir,
    // boyutları yazılıdır ve gerçekten PNG döner. CMS'te görsel girilmişse
    // (başka bir adres) yalnız mutlak olması yeterlidir.
    if (image.startsWith(`${SITE}/og/`)) {
      const expectedPath = path === "/" ? "/og/ana-sayfa" : `/og${path}`;
      assert.equal(image, `${SITE}${expectedPath}`, `${path}: og:image adresi`);
      assert.equal(meta(html, "property", "og:image:width"), "1200", `${path}: og:image:width`);
      assert.equal(meta(html, "property", "og:image:height"), "630", `${path}: og:image:height`);

      const response = await fetch(`${BASE}${expectedPath}`);
      assert.equal(response.status, 200, `${expectedPath}: durum`);
      assert.match(response.headers.get("content-type") ?? "", /^image\/(png|jpeg)/, `${expectedPath}: tip`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      assert.ok(bytes.length > 5000, `${expectedPath}: ${bytes.length} bayt`);
      // PNG imzası + IHDR'deki genişlik/yükseklik (big-endian, 16. ve 20. bayttan).
      assert.deepEqual([...bytes.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${expectedPath}: PNG imzası`);
      const view = new DataView(bytes.buffer);
      assert.equal(view.getUint32(16), 1200, `${expectedPath}: genişlik`);
      assert.equal(view.getUint32(20), 630, `${expectedPath}: yükseklik`);
    }
  }
});

test("görsel rotası bilinmeyen adrese 404 verir (serbest metin yazdırılamaz)", { skip }, async () => {
  for (const path of ["/og/herhangi-bir-metin", "/og/cozumler/olmayan-cozum", "/og/hizmetler/x"]) {
    const response = await fetch(`${BASE}${path}`);
    assert.equal(response.status, 404, path);
  }
});

test("BTU sayfası: yeni başlık ve sunucu HTML'inde açıklayıcı içerik", { skip }, async () => {
  const { html } = await page("/btu-hesaplama");
  assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)[1]), "Klima BTU Hesaplama: Kaç BTU Gerekir? | Petra Mühendislik");
  for (const text of [
    "BTU nedir?",
    "Hesaplama neye göre yapılır?",
    "Gerçek ihtiyacı başka neler etkiler?",
    "Sonuç nasıl yorumlanmalı?",
    "Sık sorulan sorular",
    "Kaç BTU klima almalıyım?",
  ]) {
    assert.ok(html.includes(text), `"${text}" sunucu HTML'inde yok`);
  }
  for (const href of ["/cozumler/multi-split-klimalar", "/cozumler/profesyonel-klimalar", "/cozumler/vrf-sistemleri", "/iletisim"]) {
    assert.ok(html.includes(`href="${href}"`), `${href} bağlantısı yok`);
  }
  // Hesaplayıcının kendi notuyla çelişen eski ifade olmamalı.
  assert.ok(!html.includes("Hesaplama hangi bilgileri dikkate alır?"));
});

test("çapraz kontrol: hiçbir Petra sayfasında Taktikalp46'ya ait iz yok", { skip }, async () => {
  for (const path of PAGES) {
    const { html } = await page(path);
    for (const needle of ["Taktikalp", "taktikalp", "t46store", "/store/", "Kydex", "kydex"]) {
      assert.ok(!html.includes(needle), `${path}: "${needle}" geçiyor`);
    }
  }
});

test("dokunulmayan sayfaların başlık ve açıklaması koddaki değerle aynı (CMS'siz yerel sunucu)", { skip: skip || (process.env.PETRA_TEST_CMS ? "CMS bağlı sunucu" : false) }, async () => {
  const unchanged = {
    "/": "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri: split, multi-split, VRF, ısı pompası ve sıcak su sistemleri.",
    "/hakkimizda":
      "Petra Mühendislik — 2017'de Kahramanmaraş'ta kurulan, ısıtma, soğutma ve iklimlendirme alanında mühendislik yaklaşımıyla çalışan bir firma.",
    "/cozumler": "Split, multi-split, profesyonel klima, VRF, ısı pompası ve sıcak su sistemleri — ihtiyacınıza uygun iklimlendirme çözümü.",
    "/referanslar":
      "Petra Mühendislik'in kamu, sağlık, turizm, eğitim ve ticari alanlarda tamamladığı iklimlendirme projelerinden referanslar.",
    "/kvkk-aydinlatma-metni":
      "Petra Mühendislik KVKK aydınlatma metni — 6698 sayılı Kanun kapsamında kişisel verilerin işlenmesine ilişkin bilgilendirme.",
    "/gizlilik-politikasi":
      "Petra Mühendislik gizlilik politikası — web sitesi ve iletişim/hizmet talepleri kapsamında kişisel bilgilerin nasıl işlenebileceği.",
    "/cerez-politikasi": "Petra Mühendislik çerez politikası — web sitesinde kullanılabilecek çerez türleri ve tercihleri yönetme.",
    "/kullanim-sartlari": "Petra Mühendislik web sitesi kullanım şartları — sitenin kullanımına ilişkin temel koşullar.",
  };
  for (const [path, expected] of Object.entries(unchanged)) {
    const { html } = await page(path);
    assert.equal(meta(html, "name", "description"), expected, path);
  }
});
