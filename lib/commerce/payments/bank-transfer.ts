import { formatIban, isValidTrIban, normalizeIban } from "../returns/iban.ts";

/**
 * Faz 40 (ek) — MAĞAZANIN HAVALE/EFT BİLGİLERİ (saf mantık).
 *
 * Uydurma/varsayılan IBAN yoktur: mağazanın kaydı yoksa ya da bozuksa değer
 * "yok" sayılır ve IBAN bölümü hiçbir yerde gösterilmez.
 */

export const BANK_TRANSFER_METHOD = "Havale-EFT";
export const ACCOUNT_HOLDER_MAX_LENGTH = 150;
export const BANK_NAME_MAX_LENGTH = 100;

export interface BankTransferDetails {
  accountHolder: string;
  bankName: string;
  /** Boşluksuz, büyük harf (TR + 24 rakam). Gösterirken formatBankIban kullanılır. */
  iban: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Veritabanı satırı → değer; eksik ya da geçersiz IBAN'lı kayıt YOK sayılır. */
export function toBankTransferDetails(row: { account_holder?: unknown; bank_name?: unknown; iban?: unknown } | null): BankTransferDetails | null {
  if (!row) return null;
  const accountHolder = text(row.account_holder);
  const bankName = text(row.bank_name);
  const iban = normalizeIban(text(row.iban));
  if (!accountHolder || !bankName || !isValidTrIban(iban)) return null;
  return { accountHolder, bankName, iban };
}

export type BankTransferInput =
  | { kind: "save"; value: BankTransferDetails }
  | { kind: "clear" }
  | { kind: "error"; error: string };

/**
 * Admin formu: üç alan da boşsa kayıt KALDIRILIR; aksi hâlde üçü de zorunlu
 * ve IBAN TR + 24 hane olmalı, kontrol hanesi (mod 97) tutmalıdır.
 */
export function parseBankTransferInput(input: { accountHolder: string; bankName: string; iban: string }): BankTransferInput {
  const accountHolder = input.accountHolder.trim();
  const bankName = input.bankName.trim();
  const iban = normalizeIban(input.iban);
  if (!accountHolder && !bankName && !iban) return { kind: "clear" };
  if (!accountHolder) return { kind: "error", error: "Hesap sahibi adı zorunlu." };
  if (accountHolder.length > ACCOUNT_HOLDER_MAX_LENGTH) return { kind: "error", error: `Hesap sahibi adı en fazla ${ACCOUNT_HOLDER_MAX_LENGTH} karakter olabilir.` };
  if (!bankName) return { kind: "error", error: "Banka adı zorunlu." };
  if (bankName.length > BANK_NAME_MAX_LENGTH) return { kind: "error", error: `Banka adı en fazla ${BANK_NAME_MAX_LENGTH} karakter olabilir.` };
  if (!/^TR\d{24}$/.test(iban)) return { kind: "error", error: "IBAN, TR ile başlayan 26 karakter olmalı (TR + 24 rakam)." };
  if (!isValidTrIban(iban)) return { kind: "error", error: "IBAN geçersiz: kontrol hanesi tutmuyor. Numarayı kontrol edin." };
  return { kind: "save", value: { accountHolder, bankName, iban } };
}

/**
 * Havale bilgisi bu sipariş için müşteriye gösterilir mi? Yalnız ödeme
 * yöntemi Havale/EFT olan, henüz ÖDENMEMİŞ ve iptal edilmemiş siparişte.
 */
export function shouldShowBankTransfer(order: { paymentMethod: string | null; paymentStatus: string; status: string }): boolean {
  return order.paymentMethod === BANK_TRANSFER_METHOD && order.paymentStatus === "unpaid" && order.status !== "cancelled";
}

/** Gösterim: dörderli gruplar ("TR12 3456 …"). */
export function formatBankIban(iban: string): string {
  return formatIban(iban);
}

/** Denetim kaydı için yalnız son 4 hane. */
export function ibanLast4(iban: string): string {
  return normalizeIban(iban).slice(-4);
}

/**
 * Admin formunun gönderimi. Kayıtlı IBAN panelde maskeli gösterildiği için
 * IBAN alanı boş gelebilir: kayıt VARSA ve IBAN alanı boşsa kayıtlı IBAN
 * korunur (yalnız ad/banka güncellenir). Kayıt yokken üç alan da zorunludur.
 * Bu fonksiyon kaydı SİLMEZ; kaldırma ayrı bir düğmedir.
 */
export function resolveBankTransferSubmission(
  input: { accountHolder: string; bankName: string; iban: string },
  existingIban: string | null,
): { kind: "save"; value: BankTransferDetails } | { kind: "error"; error: string } {
  const typedIban = normalizeIban(input.iban);
  const parsed = parseBankTransferInput({ ...input, iban: !typedIban && existingIban !== null ? existingIban : input.iban });
  if (parsed.kind === "clear") return { kind: "error", error: "Hesap sahibi adı, banka adı ve IBAN zorunlu." };
  if (parsed.kind === "error") {
    // Kayıt yokken yalnız IBAN boş bırakıldıysa biçim hatası yerine anlaşılır mesaj.
    if (!typedIban && existingIban === null && input.accountHolder.trim() && input.bankName.trim()) return { kind: "error", error: "IBAN zorunlu." };
    return parsed;
  }
  return parsed;
}
