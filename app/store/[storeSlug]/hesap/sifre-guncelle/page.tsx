import { notFound } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { Container } from "@/components/ui/container";
import { UpdatePasswordForm } from "./update-password-form";

// Session-dependent (updatePasswordAction reads cookies via getUser()) —
// see app/dashboard/layout.tsx for why this needs to be explicit.
export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export default async function StoreUpdatePasswordPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="flex flex-col items-center py-16">
        <div className="w-full max-w-sm">
          <h1 className={`${spaceGrotesk.className} mb-6 text-center text-xl font-bold text-[#F5F5F5]`}>Şifreni Güncelle</h1>
          <div className="rounded-lg border border-[#292929] bg-[#171717] p-6">
            <UpdatePasswordForm storeSlug={storeSlug} />
          </div>
        </div>
      </Container>
    </div>
  );
}
