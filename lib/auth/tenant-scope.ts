/**
 * Faz 29 — müşteri izolasyonu: saf yardımcılar (tests/tenant-scope.test.ts).
 *
 * Neden: her mağaza action'ı/sayfası `customerId`'yi URL'den (bind edilmiş
 * argüman) alıyor, `storeId`'yi de. Faz 29 öncesinde guard yalnız
 * kullanıcının `storeId`'ye erişimini kontrol ediyordu; URL'deki
 * `customerId`'nin o mağazanın GERÇEK müşterisi olup olmadığına bakılmıyordu.
 * Ajans yöneticisi (platform admin, her mağazaya erişir) için bu,
 * /customers/<Petra>/stores/<Taktikalp46>/... gibi karışık bir adresten
 * yapılan işlemin audit log'a YANLIŞ müşteriyle yazılması ve revalidate'in
 * yanlış müşterinin sayfalarını hedeflemesi demekti. Artık guard'lar
 * (lib/auth/require-store-access.ts) eşleşmezse 404 verir.
 */
export function storeMatchesCustomer(storeCustomerId: string | null | undefined, expectedCustomerId: string | null | undefined): boolean {
  if (!storeCustomerId || !expectedCustomerId) return false;
  return storeCustomerId === expectedCustomerId;
}

/**
 * Bir kaydın verilen mağazaya ait olup olmadığını soran minimal sorgu
 * arayüzü (Supabase client'ı yapısal olarak buna uyar; testte sahte
 * client verilir). RLS'e GÜVENMEZ: platform admin için RLS her mağazayı
 * açar, bu yüzden id + store_id birlikte sorgulanır.
 */
export interface OwnershipQueryClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
}

/** id'si verilen satır gerçekten `storeId` mağazasına mı ait? Hata/boş id → false (fail-closed). */
export async function rowBelongsToStore(
  client: OwnershipQueryClient,
  table: string,
  id: string | null | undefined,
  storeId: string,
): Promise<boolean> {
  if (!id || !storeId) return false;
  const { data, error } = await client.from(table).select("id").eq("id", id).eq("store_id", storeId).maybeSingle();
  if (error) {
    console.error(`[tenant-scope] ownership check failed for ${table}:`, error.message);
    return false;
  }
  return data !== null && data !== undefined;
}

/** Alıcı (e-posta/telefon) bu mağazanın abone/sipariş listesinde mi? Karşılaştırma büyük/küçük harf ve boşluk duyarsız. */
export function normalizeContact(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function contactIsKnown(candidate: string, knownContacts: Iterable<string | null | undefined>): boolean {
  const target = normalizeContact(candidate);
  if (!target) return false;
  for (const known of knownContacts) {
    if (known && normalizeContact(known) === target) return true;
  }
  return false;
}
