// Petra SEO iyileştirme — saf mantık testleri (sunucu gerektirmez).
// Çalıştırma: node --test tests/petra/seo-unit.test.mjs
// (Node 24 .ts dosyalarını tip silerek doğrudan yükler; package.json'a
// bilerek dokunulmadı, bu yüzden npm script'i yok.)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  petraSolutionSeoDescription,
  petraSolutionSeoDescriptions,
  petraStaticPageSeoDescriptions,
} from "../../lib/data/petra/seo-descriptions.ts";
import {
  PETRA_SHARE_IMAGE_STATIC_TITLES,
  applyPetraShareImage,
  petraShareImagePath,
  resolvePetraShareImageTarget,
} from "../../lib/seo/petra-share-image.ts";
import { readFileSync } from "node:fs";

// Devir metnindeki tablo (BTU satırı: kullanıcı kararıyla hesaplayıcının
// gerçekte yaptığına göre düzeltilmiş metin).
const EXPECTED = {
  "/cozumler/split-klimalar":
    "Konut ve küçük ticari mekanlar için tek iç ve dış üniteli split klima sistemleri. Petra Mühendislik ile Kahramanmaraş'ta satış, keşif ve kurulum.",
  "/cozumler/multi-split-klimalar":
    "Tek dış üniteye bağlı birden fazla iç üniteyle her odayı bağımsız iklimlendirin. Kahramanmaraş'ta multi-split klima keşfi ve kurulumu: Petra Mühendislik.",
  "/cozumler/profesyonel-klimalar":
    "Ofis, mağaza ve endüstriyel alanlar için yüksek kapasiteli profesyonel klimalar. Kahramanmaraş'ta projelendirmeden kuruluma Petra Mühendislik.",
  "/cozumler/vrf-sistemleri":
    "Büyük binalarda farklı bölgeleri bağımsız ve verimli iklimlendiren VRF sistemleri. Kahramanmaraş'ta VRF projelendirme ve kurulumu: Petra Mühendislik.",
  "/cozumler/isi-pompalari":
    "Havadaki ısı enerjisini aktararak hem ısıtan hem soğutan, verimliliği yüksek ısı pompaları. Kahramanmaraş'ta satış ve kurulum: Petra Mühendislik.",
  "/cozumler/sicak-su-sistemleri":
    "Konut ve ticari yapılar için verimli sıcak su üretim sistemleri. Kahramanmaraş'ta keşif, kurulum ve teknik servis desteği: Petra Mühendislik.",
  "/kampanyalar":
    "Petra Mühendislik'in Kahramanmaraş'taki klima ve iklimlendirme kampanyaları. Yeni kampanyalar yayınlandığında bu sayfada duyurulur.",
  "/iletisim":
    "Petra Mühendislik ile iletişime geçin: Kahramanmaraş'ta klima ve iklimlendirme için keşif talebi oluşturun, telefonla veya WhatsApp'tan ulaşın.",
  "/hizmetler":
    "Kahramanmaraş'ta klima satışı, yerinde keşif, projelendirme, profesyonel kurulum ve teknik servis. Petra Mühendislik ile uçtan uca iklimlendirme hizmeti.",
  "/projeler":
    "Petra Mühendislik ekibinin VRF, klima ve mekanik sistem uygulamalarından gerçek saha görüntüleri: ticari binalarda dış ünite kurulumu ve boru montajı.",
  "/btu-hesaplama":
    "Oda ölçüleri, bölge ve kişi sayısına göre yaklaşık klima BTU ihtiyacınızı ücretsiz hesaplayın. Kesin kapasite için yerinde keşif isteyin.",
};

test("11 sayfanın açıklaması tablodakiyle birebir aynı ve Google sınırı içinde", () => {
  const actual = {};
  for (const [slug, text] of Object.entries(petraSolutionSeoDescriptions)) actual[`/cozumler/${slug}`] = text;
  for (const [key, text] of Object.entries(petraStaticPageSeoDescriptions)) actual[`/${key}`] = text;
  assert.deepEqual(actual, EXPECTED);
  assert.equal(Object.keys(actual).length, 11);
  for (const [page, text] of Object.entries(actual)) {
    assert.ok(text.length >= 120 && text.length <= 160, `${page}: ${text.length} karakter`);
    assert.doesNotMatch(text, /Taktikalp|t46store|Kydex/i);
  }
});

test("çözüm açıklaması: eşlemede olmayan slug ve prototip anahtarı null döner (kart özetine düşülür)", () => {
  assert.equal(petraSolutionSeoDescription("vrf-sistemleri"), EXPECTED["/cozumler/vrf-sistemleri"]);
  assert.equal(petraSolutionSeoDescription("yeni-cozum"), null);
  assert.equal(petraSolutionSeoDescription("constructor"), null);
  assert.equal(petraSolutionSeoDescription("toString"), null);
});

test("paylaşım görseli adresi: ana sayfa, statik sayfa ve çözüm", () => {
  assert.equal(petraShareImagePath("/"), "/og/ana-sayfa");
  assert.equal(petraShareImagePath("/hizmetler"), "/og/hizmetler");
  assert.equal(petraShareImagePath("/cozumler/vrf-sistemleri"), "/og/cozumler/vrf-sistemleri");
});

test("görsel rotası: yalnız bilinen sayfalar ve çözümler; serbest metin yazdırılamaz", () => {
  assert.deepEqual(resolvePetraShareImageTarget(["ana-sayfa"]), { kind: "static", title: "Kahramanmaraş İklimlendirme Çözümleri" });
  assert.deepEqual(resolvePetraShareImageTarget(["iletisim"]), { kind: "static", title: "İletişim" });
  assert.deepEqual(resolvePetraShareImageTarget(["cozumler"]), { kind: "static", title: "Çözümler" });
  assert.deepEqual(resolvePetraShareImageTarget(["cozumler", "isi-pompalari"]), { kind: "solution", slug: "isi-pompalari" });
  for (const bad of [[], ["herhangi-bir-metin"], ["constructor"], ["hizmetler", "x"], ["cozumler", "a", "b"], ["cozumler", ""]]) {
    assert.equal(resolvePetraShareImageTarget(bad), null, JSON.stringify(bad));
  }
  // 13 sabit başlık: ana sayfa + 8 statik sayfa + 4 yasal sayfa (6 çözüm ayrıca çözüm adından gelir → 19 sayfa).
  assert.equal(Object.keys(PETRA_SHARE_IMAGE_STATIC_TITLES).length, 13);
});

test("görsel önceliği: sayfa CMS görseli → site geneli CMS görseli → varsayılan", () => {
  const options = { pagePath: "/hizmetler", siteName: "Petra Mühendislik" };

  const fallback = applyPetraShareImage({ title: "Hizmetler", openGraph: { url: "/hizmetler" } }, options);
  assert.deepEqual(fallback.openGraph.images, [{ url: "/og/hizmetler", width: 1200, height: 630, type: "image/png" }]);
  assert.equal(fallback.openGraph.url, "/hizmetler");
  assert.equal(fallback.openGraph.siteName, "Petra Mühendislik");
  assert.equal(fallback.openGraph.locale, "tr_TR");
  assert.equal(fallback.twitter.card, "summary_large_image");
  assert.deepEqual(fallback.twitter.images, fallback.openGraph.images);
  // Başlık/açıklama twitter'a YAZILMAZ: Next sayfanın kendi değerlerinden doldurur.
  assert.ok(!("title" in fallback.twitter) && !("description" in fallback.twitter));

  const siteWide = applyPetraShareImage({ openGraph: { url: "/hizmetler" } }, { ...options, siteWideOgImage: "https://cms.example/site.jpg" });
  assert.deepEqual(siteWide.openGraph.images, [{ url: "https://cms.example/site.jpg" }]);
  assert.deepEqual(siteWide.twitter.images, [{ url: "https://cms.example/site.jpg" }]);

  const pageLevel = applyPetraShareImage(
    { openGraph: { images: [{ url: "https://cms.example/page.jpg" }] }, twitter: { card: "summary", title: "T", description: "D" } },
    { ...options, siteWideOgImage: "https://cms.example/site.jpg" },
  );
  assert.deepEqual(pageLevel.openGraph.images, [{ url: "https://cms.example/page.jpg" }]);
  assert.equal(pageLevel.twitter.card, "summary_large_image");
  assert.equal(pageLevel.twitter.title, "T");
  assert.equal(pageLevel.twitter.description, "D");

  // Boş dizi "görsel yok" sayılır.
  assert.equal(applyPetraShareImage({ openGraph: { images: [] } }, options).openGraph.images[0].url, "/og/hizmetler");
});

test("BTU metni hesaplayıcıyla çelişmiyor: formül yalnız alan, bölge ve kişi sayısını kullanır", () => {
  // lib/btu/calculate.ts göreceli/uzantısız import kullandığı için burada
  // çalıştırılmıyor, kaynağı okunuyor. Formül değişirse bu test düşer ve
  // components/btu/btu-guide.tsx ile BTU açıklamasının güncellenmesi gerektiğini hatırlatır.
  const source = readFileSync(new URL("../../lib/btu/calculate.ts", import.meta.url), "utf8");
  assert.match(source, /const totalBtu = areaLoadBtu \+ peopleLoadBtu;/);
  assert.match(source, /const areaLoadBtu = areaSquareMeters \* regionCoefficient;/);
  for (const unused of ["ceilingHeightMeters", "windowCount", "facade", "sunExposure", "insulationLevel", "heatGeneratingEquipment"]) {
    assert.ok(!source.includes(unused), `${unused} artık formülde: BTU metnini güncelleyin`);
  }
  // §1c — standart kapasite listesi (metne eklenirse bununla birebir aynı olmalı).
  assert.match(source, /STANDARD_CAPACITIES_BTU = \[9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000\] as const;/);

  const guide = readFileSync(new URL("../../components/btu/btu-guide.tsx", import.meta.url), "utf8");
  assert.ok(!/^\s*["']use client["']/m.test(guide), "BtuGuide sunucu bileşeni olmalı (Google'ın görmesi için)");
  assert.ok(guide.includes("Hesaplama neye göre yapılır?") && guide.includes("bu ön hesaba katılmaz"));
  assert.ok(!guide.includes("Hesaplama hangi bilgileri dikkate alır?"));
});
