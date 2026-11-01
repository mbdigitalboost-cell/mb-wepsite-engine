import "server-only";

import { randomInt } from "node:crypto";

/**
 * Admin Kullanıcı Oluşturma devir metni — e-posta davetinin yerini alan
 * geçici şifre üretimi. Belirsiz görünebilecek karakterler (I/O/0/1/l)
 * BİLİNÇLİ OLARAK dışarıda bırakıldı — admin bu şifreyi WhatsApp/telefonla
 * kullanıcıya KENDİSİ okuyup/yazıp iletecek, bir "I" ile "l"yi ya da "0"
 * ile "O"yu karıştırmak kullanıcıyı ilk girişte kilitler.
 *
 * `crypto.randomInt` (node:crypto, kriptografik olarak güvenli) kullanılıyor
 * — `Math.random()` DEĞİL. Her karakter sınıfından (büyük/küçük harf,
 * rakam, sembol) en az bir tane garanti edilir, sonra geri kalan karakterler
 * + Fisher-Yates karıştırma (yine `randomInt` ile) ile tüm dizi karıştırılır
 * — böylece zorunlu karakterler her zaman aynı pozisyonlarda durmaz.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

export function generateTempPassword(length = 14): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
