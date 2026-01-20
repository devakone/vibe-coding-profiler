import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";
import { JobsProvider } from "@/contexts/JobsContext";
import AppHeader from "./AppHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8108";

export const metadata: Metadata = {
  title: "Vibed Coding · Your AI coding profile",
  description:
    "Turn your commit history into a Vibed Coding Persona — patterns, insights, and shareable profiles grounded in commit evidence.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Vibed Coding · Your AI coding profile",
    description:
      "A shareable Vibed Coding Persona from your commit history — patterns and insights grounded in evidence.",
    url: appUrl,
    locale: "en_US",
    type: "website",
    siteName: "Vibed Coding",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibed Coding · Your AI coding profile",
    description:
      "A shareable Vibed Coding Persona from your commit history — patterns and insights grounded in evidence.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = (userData as { is_admin: boolean } | null)?.is_admin === true;
  }

  async function signOut() {
    "use server";

    const serverSupabase = await createSupabaseServerClient();
    await serverSupabase.auth.signOut();
    redirect("/");
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ${wrappedTheme.background}`}
      >
        <div className={wrappedTheme.backgroundOrbs.wrapper}>
          <div className={wrappedTheme.backgroundOrbs.orbA} />
          <div className={wrappedTheme.backgroundOrbs.orbB} />
          <div className={wrappedTheme.backgroundOrbs.orbC} />
          <div className={wrappedTheme.backgroundOrbs.vignette} />
        </div>
        <AppHeader isAuthed={Boolean(user)} isAdmin={isAdmin} signOut={signOut} />
        {user ? <JobsProvider>{children}</JobsProvider> : children}
        <Toaster />
      </body>
    </html>
  );
}
