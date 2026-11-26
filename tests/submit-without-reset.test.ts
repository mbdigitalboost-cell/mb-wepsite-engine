import assert from "node:assert/strict";
import { test } from "node:test";
import { submitWithoutReset } from "../lib/utils/submit-without-reset.ts";

/**
 * Faz 37 Kısım A — "dokunmadan kaydet tüm alanları korur". Kök neden React
 * 19'un başarılı action sonrası form.reset() yapmasıydı (istemci tarafı
 * gezinmede kontrollü marka seçimi "— Yok —"a dönüyordu; tarayıcıda
 * doğrulandı: sıfırlama sonrası FormData brandId = ""). Düzenleme formları
 * artık action'ı submit olayında elle çağırır: varsayılan gönderim
 * engellenir, form HİÇ sıfırlanmaz, aynı FormData action'a gider.
 */
test("edit form submit never resets the form and sends the form's current values", () => {
  let prevented = false;
  let resetCalls = 0;
  const form = {
    reset() {
      resetCalls += 1;
    },
  } as unknown as HTMLFormElement;
  const submitter = { name: "save" } as unknown as HTMLElement;
  const current = new FormData();
  current.set("brandId", "ca1c0eff-773c-4273-b60e-47704c55bf3a");
  current.set("isActive", "on");

  const dispatched: FormData[] = [];
  const handler = submitWithoutReset(
    (formData) => dispatched.push(formData),
    (target, usedSubmitter) => {
      assert.equal(target, form);
      assert.equal(usedSubmitter, submitter);
      return current;
    },
  );

  // İki kez art arda "Kaydet" (11-14 ve 11-16'daki gibi): ikincisinde de marka korunur.
  for (let i = 0; i < 2; i += 1) {
    handler({ preventDefault: () => (prevented = true), currentTarget: form, nativeEvent: { submitter } as unknown as Event });
  }
  assert.equal(prevented, true);
  assert.equal(resetCalls, 0);
  assert.equal(dispatched.length, 2);
  assert.equal(dispatched[1].get("brandId"), "ca1c0eff-773c-4273-b60e-47704c55bf3a");
  assert.equal(dispatched[1].get("isActive"), "on");
});
