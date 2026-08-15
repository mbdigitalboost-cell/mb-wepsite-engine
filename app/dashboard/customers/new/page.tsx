import { requireAdmin } from "@/lib/auth/require-admin";
import { CustomerForm } from "./customer-form";

export default async function NewCustomerPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Yeni Müşteri</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Platform DB&apos;ye yeni bir müşteri kaydı ekler. Website ve kullanıcı
        eklemek için müşteri oluşturulduktan sonra müşteri sayfasına
        yönlendirileceksiniz.
      </p>
      <div className="mt-6">
        <CustomerForm />
      </div>
    </div>
  );
}
