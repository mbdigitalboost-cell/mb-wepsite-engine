/** "use server" dosyası yalnız async fonksiyon dışa aktarabildiği için durum tipi burada. */
export interface BankTransferSaved {
  accountHolder: string;
  bankName: string;
  /** Yalnız son 4 hane; tam IBAN istemciye gönderilmez. */
  ibanLast4: string;
}

export interface BankTransferFormState {
  error: string | null;
  success: string | null;
}

export const initialBankTransferFormState: BankTransferFormState = { error: null, success: null };
