// Petra lead bildirimi — saf mantık testleri (sunucu ve ağ gerektirmez; hiçbir
// yere lead yazmaz, e-posta göndermez).
// Çalıştırma: node --test tests/petra/lead-notification.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildLeadEmail, deliverLeadNotification, resolveLeadSender } from "../../lib/notifications/petra-lead-notification.ts";

const INPUT = { fullName: "Ayşe Örnek", phone: "05001112233", email: "ayse@ornek.example", service: "Klima", message: "Salon için keşif istiyorum" };
const LEAD_VALUES = [INPUT.fullName, INPUT.phone, INPUT.email, INPUT.message, "alici@ornek.example", "re_test_key"];

function harness(overrides = {}, response = { ok: true, status: 200, text: async () => "{}" }) {
  const calls = [];
  const logs = [];
  const deps = {
    apiKey: "re_test_key",
    to: "alici@ornek.example",
    fromRaw: "bildirim@ornek.example",
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (response instanceof Error) throw response;
      return response;
    },
    logError: (message) => logs.push(message),
    ...overrides,
  };
  return { deps, calls, logs };
}

function assertNoLeadContent(logs) {
  for (const line of logs) for (const value of LEAD_VALUES) assert.ok(!line.includes(value), `log lead içeriği/gizli değer içeriyor: ${value}`);
}

test("gönderen: ortam değeri olduğu gibi kullanılır; boş ya da geçersizse yok sayılır", () => {
  assert.equal(resolveLeadSender("bildirim@ornek.example"), "bildirim@ornek.example");
  assert.equal(resolveLeadSender("  bildirim@ornek.example  "), "bildirim@ornek.example");
  assert.equal(resolveLeadSender("Örnek Firma <bildirim@ornek.example>"), "Örnek Firma <bildirim@ornek.example>");
  for (const bad of [undefined, null, "", "   ", "bildirim", "bildirim@", "@ornek.example", "Ad <bildirim>", "a b@ornek.example", "<bildirim@ornek.example"]) {
    assert.equal(resolveLeadSender(bad), null, String(bad));
  }
});

test("yedek gönderen yok: kaynakta sağlayıcının ortak deneme adresi geçmez", () => {
  for (const file of ["lib/notifications/petra-lead-notification.ts", "lib/notifications/send-lead-notification.ts"]) {
    assert.doesNotMatch(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), /resend\.dev/);
  }
});

test("gönderen ayarı yoksa e-posta gönderilmez ve loga 'gönderen ayarı yok' yazılır", async () => {
  for (const fromRaw of [undefined, "", "geçersiz"]) {
    const { deps, calls, logs } = harness({ fromRaw });
    assert.deepEqual(await deliverLeadNotification(deps, INPUT), { status: "no_sender" });
    assert.equal(calls.length, 0);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /gönderen ayarı yok/);
    assertNoLeadContent(logs);
  }
});

test("anahtar ya da alıcı yoksa sessizce atlanır (kurulmamış, olağan durum)", async () => {
  for (const overrides of [{ apiKey: undefined }, { to: undefined }]) {
    const { deps, calls, logs } = harness(overrides);
    assert.deepEqual(await deliverLeadNotification(deps, INPUT), { status: "not_configured" });
    assert.equal(calls.length, 0);
    assert.equal(logs.length, 0);
  }
});

test("gönderim: gönderen değişmeden gider, görünen ad eklenmez; içerik önceki metinle aynı", async () => {
  const { deps, calls, logs } = harness();
  assert.deepEqual(await deliverLeadNotification(deps, INPUT), { status: "sent" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].init.headers.Authorization, "Bearer re_test_key");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.from, "bildirim@ornek.example");
  assert.deepEqual(body.to, ["alici@ornek.example"]);
  assert.equal(body.subject, "Yeni keşif talebi — Ayşe Örnek");
  assert.equal(
    body.text,
    "Web sitenizden yeni bir keşif talebi geldi.\n\nAd Soyad: Ayşe Örnek\nTelefon: 05001112233\nE-posta: ayse@ornek.example\nİlgilenilen hizmet: Klima\nMesaj: Salon için keşif istiyorum",
  );
  assert.equal(logs.length, 0);

  const named = harness({ fromRaw: "Örnek Firma <bildirim@ornek.example>" });
  await deliverLeadNotification(named.deps, INPUT);
  assert.equal(JSON.parse(named.calls[0].init.body).from, "Örnek Firma <bildirim@ornek.example>");

  assert.equal(buildLeadEmail({ fullName: "A", phone: "1" }).text, "Web sitenizden yeni bir keşif talebi geldi.\n\nAd Soyad: A\nTelefon: 1\nE-posta: belirtilmedi");
});

test("sağlayıcı hatası loga yazılır (yutulmaz), hata fırlatılmaz, loga lead içeriği yazılmaz", async () => {
  const errorBody = JSON.stringify({ statusCode: 403, name: "validation_error", message: "The ornek.example domain is not verified.", echo: INPUT });
  const { deps, logs } = harness({}, { ok: false, status: 403, text: async () => errorBody });
  const outcome = await deliverLeadNotification(deps, INPUT);
  assert.equal(outcome.status, "failed");
  assert.equal(logs.length, 1);
  assert.match(logs[0], /HTTP 403 validation_error: The ornek\.example domain is not verified\./);
  assertNoLeadContent(logs);

  // Gövde JSON değilse yalnız durum kodu yazılır (ham gövde loglanmaz).
  const raw = harness({}, { ok: false, status: 500, text: async () => `hata ${INPUT.fullName} ${INPUT.phone}` });
  assert.deepEqual(await deliverLeadNotification(raw.deps, INPUT), { status: "failed", reason: "HTTP 500" });
  assertNoLeadContent(raw.logs);
});

test("ağ hatası: loga yalnız hata türü yazılır, hata asla dışarı çıkmaz", async () => {
  const boom = new TypeError(`fetch failed for ${INPUT.fullName} ${INPUT.phone}`);
  const { deps, logs } = harness({}, boom);
  await assert.doesNotReject(deliverLeadNotification(deps, INPUT));
  assert.equal(logs.length, 1);
  assert.match(logs[0], /gönderim hatası: TypeError/);
  assertNoLeadContent(logs);

  // Log yazımı da hata verse bile form etkilenmez.
  const broken = harness({ logError: () => { throw new Error("log yok"); } }, boom);
  await assert.doesNotReject(deliverLeadNotification(broken.deps, INPUT));
});

test("gönderen 'Ad <adres>' biçimi: Türkçe karakterli ad ve köşeli parantez kabul edilir, olduğu gibi gönderilir", async () => {
  const value = "Petra Mühendislik <bildirim@petramuhendislik.com>";
  assert.equal(resolveLeadSender(value), value);
  assert.equal(resolveLeadSender(`  ${value}  `), value);
  const { deps, calls, logs } = harness({ fromRaw: value });
  assert.deepEqual(await deliverLeadNotification(deps, INPUT), { status: "sent" });
  assert.equal(JSON.parse(calls[0].init.body).from, value);
  assert.equal(logs.length, 0);
  // Bozuk yazımlar gönderen sayılmaz (e-posta gönderilmez).
  for (const bad of ["Petra Mühendislik <bildirim@petramuhendislik.com", "Petra Mühendislik bildirim@petramuhendislik.com>", "Petra Mühendislik <>", "Petra Mühendislik <petramuhendislik.com>"]) {
    assert.equal(resolveLeadSender(bad), null, bad);
  }
});
