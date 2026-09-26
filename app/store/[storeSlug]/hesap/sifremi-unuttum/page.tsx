import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { Container } from "@/components/ui/container";
import { RequestResetForm } from "./request-reset-form";

export default async function StorePasswordResetRequestPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  return (
    <Container className="flex flex-col items-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">Şifremi Unuttum</h1>
        <div className="rounded-lg border border-black/10 p-6 shadow-sm">
          <RequestResetForm storeSlug={storeSlug} />
        </div>
      </div>
    </Container>
  );
}
