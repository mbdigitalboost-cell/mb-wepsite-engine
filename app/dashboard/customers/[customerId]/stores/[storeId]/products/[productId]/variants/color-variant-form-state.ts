/** Faz 25 — color-variant-actions.ts'in form durumu ("use server" dosyası yalnız async fonksiyon dışa aktarabildiği için ayrı). */
export interface ColorVariantFormState {
  error: string | null;
  success: string | null;
}

export const initialColorVariantFormState: ColorVariantFormState = { error: null, success: null };
