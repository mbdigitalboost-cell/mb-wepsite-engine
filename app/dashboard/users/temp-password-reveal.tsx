"use client";

import { useState } from "react";

interface TempPasswordRevealProps {
  email: string;
  tempPassword: string;
}

/**
 * Admin Kullanıcı Oluşturma devir metni — geçici şifrenin TEK SEFERLİK
 * gösterimi. createUserAction/resetUserPasswordAction'ın dönüş değerinde
 * bir kez var, bu bileşen onu ekranda gösterip bir "Kopyala" butonu
 * sunuyor — sayfa yenilenince (revalidatePath zaten her iki action'da da
 * çağrılıyor) bu state kaybolur, şifre hiçbir yerde kalıcı saklanmaz.
 *
 * CreateUserForm VE ResetPasswordForm tarafından PAYLAŞILAN tek bileşen —
 * ikisi de aynı `{email, tempPassword}` şeklini üretiyor.
 */
export function TempPasswordReveal({ email, tempPassword }: TempPasswordRevealProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50/60 p-4 text-sm">
      <p className="font-medium text-amber-900">
        {email} için kullanıcı oluşturuldu. Geçici şifre:
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-white px-3 py-1.5 font-mono text-sm text-foreground">{tempPassword}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(tempPassword).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          {copied ? "Kopyalandı ✓" : "Kopyala"}
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-800">
        Bu şifre bir daha gösterilmeyecek — şimdi kullanıcıya (WhatsApp/telefon vb.) iletin. İlk girişte şifresini
        değiştirmesi zorunlu tutulacak.
      </p>
    </div>
  );
}
