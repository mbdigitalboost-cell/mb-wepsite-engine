import type { LegalOrderContext, LegalOrderLine } from "./context.ts";

/**
 * Faz 33 — ödeme adımındaki onaylar (saf; testli).
 *  - Ön Bilgilendirme + Mesafeli Satış onayı ZORUNLU; sunucu da kontrol eder.
 *  - Ticari elektronik ileti onayı AYRI ve OPSİYONEL (6563 ETK m.6;
 *    Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik):
 *    siparişin şartı olamaz, varsayılan işaretsiz.
 *  - KVKK aydınlatması bir BAĞLANTIDIR, onay kutusu değil (sözleşmenin
 *    ifası için işlemeye açık rıza istenmez).
 */

export const LEGAL_ACCEPTANCE_LABEL = "Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni okudum, onaylıyorum.";
export const LEGAL_ACCEPTANCE_ERROR = "Siparişi tamamlamak için Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni onaylamanız gerekir.";
export const MARKETING_CONSENT_TEXT =
  "Kampanya, indirim ve duyurulardan e-posta, SMS ve WhatsApp ile haberdar olmak istiyorum; ticari elektronik ileti almayı kabul ediyorum. (İsteğe bağlı — onayınızı dilediğiniz zaman geri alabilirsiniz.)";

/** HTML checkbox: işaretliyse "on" gelir; başka her şey "işaretsiz". */
export function isChecked(value: FormDataEntryValue | null | undefined): boolean {
  return value === "on";
}

/** Sunucu kararı: metinler yayımlanmışsa onay şart; yoksa (başka mağaza / migration yok) akış eskisi gibi. */
export function legalAcceptanceError(required: boolean, value: FormDataEntryValue | null | undefined): string | null {
  return required && !isChecked(value) ? LEGAL_ACCEPTANCE_ERROR : null;
}

export interface CheckoutLegalInput {
  orderNumber: number | null;
  date: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: { neighborhood: string; line: string; district: string; city: string };
  billing: {
    type: "individual" | "corporate";
    name: string | null;
    taxOffice: string | null;
    sameAsShipping: boolean;
    addressLine: string | null;
    district: string | null;
    city: string | null;
  };
  lines: Array<{ productName: string; variantLabel: string | null; addons: Array<{ addonName: string }>; quantity: number; lineTotal: number }>;
  subtotal: number;
  discountAmount: number;
  discountCode: string | null;
  shippingFee: number;
  codFee: number;
  total: number;
  paymentMethod: string;
}

function joinAddress(parts: Array<string | null | undefined>): string {
  return parts.map((part) => (part ?? "").trim()).filter(Boolean).join(", ");
}

/**
 * Ödeme formu + sunucu hesabından şablon siparişi. Fatura satırına TCKN/VKN
 * YAZILMAZ (sözleşme metni misafir bağlantısıyla da açılabilir; kişisel
 * veriyi gereğinden fazla çoğaltmayalım) — yalnız tür, ad/unvan, vergi
 * dairesi ve adres.
 */
export function legalOrderFromCheckout(input: CheckoutLegalInput): LegalOrderContext {
  const deliveryAddress = joinAddress([input.address.neighborhood, input.address.line, `${input.address.district} / ${input.address.city}`]);
  const billingName = (input.billing.name ?? "").trim() || input.customerName.trim();
  const billingAddress = input.billing.sameAsShipping
    ? "teslimat adresiyle aynı"
    : joinAddress([input.billing.addressLine, input.billing.district && input.billing.city ? `${input.billing.district} / ${input.billing.city}` : null]);
  const billing = [
    input.billing.type === "corporate" ? `Kurumsal — ${billingName}` : `Bireysel — ${billingName}`,
    input.billing.type === "corporate" && input.billing.taxOffice ? `Vergi dairesi: ${input.billing.taxOffice}` : null,
    billingAddress ? `Adres: ${billingAddress}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  const lines: LegalOrderLine[] = input.lines.map((line) => ({
    name: line.productName,
    variant: line.variantLabel,
    addons: line.addons.map((addon) => addon.addonName),
    quantity: line.quantity,
    lineTotal: line.lineTotal,
  }));
  return {
    orderNumber: input.orderNumber,
    date: input.date,
    buyer: { name: input.customerName, phone: input.customerPhone, email: input.customerEmail },
    deliveryAddress,
    billing,
    lines,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount,
    discountCode: input.discountCode,
    shippingFee: input.shippingFee,
    codFee: input.codFee,
    total: input.total,
    paymentMethod: input.paymentMethod,
  };
}

export interface RenderedForAcceptance {
  documentId: string;
  version: number;
  text: string;
}

/**
 * order_legal_acceptances satırı. Anlık görüntü o andaki DOLDURULMUŞ metnin
 * kopyasıdır: şablon sonradan yeni sürümle değişse de bu satır değişmez
 * (satır güncellenmez; tabloya istemci yazamaz).
 */
export function buildAcceptanceRecord(params: {
  storeId: string;
  orderId: string;
  preInformation: RenderedForAcceptance;
  distanceSales: RenderedForAcceptance;
  marketingConsent: boolean;
  acceptedAt: Date;
}) {
  return {
    store_id: params.storeId,
    order_id: params.orderId,
    pre_information_document_id: params.preInformation.documentId,
    distance_sales_document_id: params.distanceSales.documentId,
    pre_information_version: params.preInformation.version,
    distance_sales_version: params.distanceSales.version,
    pre_information_snapshot: params.preInformation.text,
    distance_sales_snapshot: params.distanceSales.text,
    accepted_at: params.acceptedAt.toISOString(),
    marketing_consent: params.marketingConsent,
    marketing_consent_text: params.marketingConsent ? MARKETING_CONSENT_TEXT : null,
  };
}
