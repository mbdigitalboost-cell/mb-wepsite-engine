export interface ProductFormState {
  error: string | null;
  /** Faz 34 — kayıt sonrası bilgi (ör. varyant fiyatlarının ürün fiyatını izlemesi). */
  notice?: string | null;
}

export const initialProductFormState: ProductFormState = { error: null };
