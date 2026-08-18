import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/get-optional-user";
import { isSupabaseConfigured } from "@/lib/config/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Giriş Yap",
  // Internal login screen should never be indexed by search engines.
  robots: { index: false, follow: false },
};

// Same reasoning as app/dashboard/layout.tsx: this page's "already logged
// in? redirect" check must run per-request, not get baked into a static
// response.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already logged in? Skip straight to the dashboard instead of showing
  // the form again.
  const user = await getOptionalUser();
  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/images/mb-digital-boost/mb-mark.png"
            alt="MB Digital Boost"
            width={40}
            height={40}
            className="mx-auto"
            priority
          />
          <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">MB Digital Boost</p>
          <h1 className="mt-2 text-xl font-semibold text-foreground">Panele giriş yapın</h1>
        </div>

        {error === "auth_callback_failed" ? (
          <p role="alert" className="mb-4 text-center text-sm text-red-600">
            Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.
          </p>
        ) : null}

        <div className="rounded-lg border border-black/10 p-6 shadow-sm">
          <LoginForm />
        </div>

        {!isSupabaseConfigured() ? (
          <p className="mt-4 text-center text-xs text-foreground/50">
            Not: Platform Supabase projesi henüz bağlanmadı — giriş şu an
            çalışmayacak.
          </p>
        ) : null}
      </div>
    </main>
  );
}
