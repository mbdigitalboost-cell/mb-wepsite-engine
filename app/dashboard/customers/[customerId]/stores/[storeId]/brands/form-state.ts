export interface BrandFormState {
  error: string | null;
}

export const initialBrandFormState: BrandFormState = { error: null };

/** Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C — marka logosu yüklemesi. */
export interface BrandLogoFormState {
  error: string | null;
}

export const initialBrandLogoFormState: BrandLogoFormState = { error: null };

/** Aynı devir metni, Kısım C — tek bir model ekleme formu. */
export interface BrandModelFormState {
  error: string | null;
}

export const initialBrandModelFormState: BrandModelFormState = { error: null };
