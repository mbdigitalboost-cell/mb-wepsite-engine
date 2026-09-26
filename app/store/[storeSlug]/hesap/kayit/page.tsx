import { notFound, redirect } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { Container } from "@/components/ui/container";
import { SignupForm } from "./signup-form";

/**
 * FAZ 5.1 — storefront customer signup. `force-dynamic` for the same
 * reason as app/(auth)/login/page.tsx: the "already logged in?" check
 * below must run per-request, never get baked into a static response.
 */
export const dynamic = "force-dynamic";

export default async function StoreSignupPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/store/${storeSlug}/hesap`);

  return (
    <Container className="flex flex-col items-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">Hesap Oluştur</h1>
        <div className="rounded-lg border border-black/10 p-6 shadow-sm">
          <SignupForm storeSlug={storeSlug} />
        </div>
      </div>
    </Container>
  );
}
