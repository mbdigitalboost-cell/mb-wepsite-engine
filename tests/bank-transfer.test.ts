import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BANK_TRANSFER_METHOD,
  formatBankIban,
  ibanLast4,
  parseBankTransferInput,
  shouldShowBankTransfer,
  toBankTransferDetails,
} from "../lib/commerce/payments/bank-transfer.ts";

/** Faz 40 (ek) — mağazanın Havale/EFT bilgileri: uydurma IBAN yok, kontrol hanesi doğrulanır. */

// Kontrol hanesi geçerli, herkese açık örnek IBAN (gerçek bir hesaba ait değildir).
const VALID = "TR330006100519786457841326";

test("satır okunur; eksik ya da geçersiz IBAN'lı kayıt yok sayılır", () => {
  assert.equal(toBankTransferDetails(null), null);
  assert.deepEqual(toBankTransferDetails({ account_holder: " Örnek Ltd. ", bank_name: "Örnek Bankası", iban: "tr33 0006 1005 1978 6457 8413 26" }), {
    accountHolder: "Örnek Ltd.",
    bankName: "Örnek Bankası",
    iban: VALID,
  });
  assert.equal(toBankTransferDetails({ account_holder: "", bank_name: "Banka", iban: VALID }), null);
  assert.equal(toBankTransferDetails({ account_holder: "Ad", bank_name: "", iban: VALID }), null);
  assert.equal(toBankTransferDetails({ account_holder: "Ad", bank_name: "Banka", iban: "TR330006100519786457841327" }), null);
  assert.equal(toBankTransferDetails({ account_holder: "Ad", bank_name: "Banka", iban: 5 }), null);
});

test("admin girdisi: TR + 24 hane ve kontrol hanesi; boşluklu yazım kabul edilir", () => {
  assert.deepEqual(parseBankTransferInput({ accountHolder: "Örnek Ltd.", bankName: "Örnek Bankası", iban: "TR33 0006 1005 1978 6457 8413 26" }), {
    kind: "save",
    value: { accountHolder: "Örnek Ltd.", bankName: "Örnek Bankası", iban: VALID },
  });
  const kind = (input: { accountHolder: string; bankName: string; iban: string }) => parseBankTransferInput(input).kind;
  assert.equal(kind({ accountHolder: "", bankName: "Banka", iban: VALID }), "error");
  assert.equal(kind({ accountHolder: "Ad", bankName: "", iban: VALID }), "error");
  assert.equal(kind({ accountHolder: "Ad", bankName: "Banka", iban: "" }), "error");
  assert.equal(kind({ accountHolder: "Ad", bankName: "Banka", iban: "TR3300061005197864578413" }), "error");
  assert.equal(kind({ accountHolder: "Ad", bankName: "Banka", iban: "DE89370400440532013000" }), "error");
  // Biçim doğru ama kontrol hanesi tutmuyor (son rakam değişti).
  const wrongCheck = parseBankTransferInput({ accountHolder: "Ad", bankName: "Banka", iban: "TR330006100519786457841327" });
  assert.equal(wrongCheck.kind, "error");
  assert.match(wrongCheck.kind === "error" ? wrongCheck.error : "", /kontrol hanesi/);
});

test("üç alan da boşsa kayıt kaldırılır (varsayılan değer üretilmez)", () => {
  assert.deepEqual(parseBankTransferInput({ accountHolder: "  ", bankName: "", iban: " " }), { kind: "clear" });
});

test("Havale bilgisi yalnız ödenmemiş, iptal edilmemiş Havale siparişinde gösterilir", () => {
  const show = (paymentMethod: string | null, paymentStatus: string, status: string) => shouldShowBankTransfer({ paymentMethod, paymentStatus, status });
  assert.equal(show(BANK_TRANSFER_METHOD, "unpaid", "pending"), true);
  assert.equal(show(BANK_TRANSFER_METHOD, "unpaid", "confirmed"), true);
  assert.equal(show(BANK_TRANSFER_METHOD, "paid", "confirmed"), false);
  assert.equal(show(BANK_TRANSFER_METHOD, "unpaid", "cancelled"), false);
  assert.equal(show("Kapıda Nakit", "unpaid", "pending"), false);
  assert.equal(show("Kredi Kartı", "unpaid", "pending"), false);
  assert.equal(show(null, "unpaid", "pending"), false);
});

test("gösterim dörderli gruplarla; denetim kaydı için yalnız son 4 hane", () => {
  assert.equal(formatBankIban(VALID), "TR33 0006 1005 1978 6457 8413 26");
  assert.equal(ibanLast4("TR33 0006 1005 1978 6457 8413 26"), "1326");
});
