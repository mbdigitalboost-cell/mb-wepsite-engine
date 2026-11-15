export interface RevealIbanState {
  iban: string | null;
  holder: string | null;
  error: string | null;
}

export const initialRevealIbanState: RevealIbanState = { iban: null, holder: null, error: null };
