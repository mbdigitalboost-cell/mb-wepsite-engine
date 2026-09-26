import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { Container } from "@/components/ui/container";
import { UpdatePasswordForm } from "./update-password-form";

// Session-dependent (updatePasswordAction reads cookies via getUser()) —
// see app/dashboard/layout.tsx for why this needs to be explicit.
export const dynamic = "force-dynamic";

export default async function StoreUpdatePasswordPage({
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
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">Şifreni Güncelle</h1>
        <div className="rounded-lg border border-black/10 p-6 shadow-sm">
          <UpdatePasswordForm storeSlug={storeSlug} />
        </div>
      </div>
    </Container>
  );
}
