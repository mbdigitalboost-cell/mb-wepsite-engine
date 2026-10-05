import { notFound, redirect } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { Container } from "@/components/ui/container";
import { StoreLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export default async function StoreLoginPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/store/${storeSlug}/hesap`);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="flex flex-col items-center py-16">
        <div className="w-full max-w-sm">
          <h1 className={`${spaceGrotesk.className} mb-6 text-center text-xl font-bold text-[#F5F5F5]`}>Giriş Yap</h1>
          <div className="rounded-lg border border-[#292929] bg-[#171717] p-6">
            <StoreLoginForm storeSlug={storeSlug} />
          </div>
        </div>
      </Container>
    </div>
  );
}
