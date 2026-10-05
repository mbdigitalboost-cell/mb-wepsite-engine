import { notFound } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { Container } from "@/components/ui/container";
import { RequestResetForm } from "./request-reset-form";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export default async function StorePasswordResetRequestPage({
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
          <h1 className={`${spaceGrotesk.className} mb-6 text-center text-xl font-bold text-[#F5F5F5]`}>Şifremi Unuttum</h1>
          <div className="rounded-lg border border-[#292929] bg-[#171717] p-6">
            <RequestResetForm storeSlug={storeSlug} />
          </div>
        </div>
      </Container>
    </div>
  );
}
