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
  title: "Vibe Coding Profiler · Discover your AI coding style",
  description:
    "Vibe Coding Profiler analyzes your commit history to reveal your unique Vibe Coding Profile (VCP) — patterns, insights, and shareable profiles grounded in commit evidence.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Vibe Coding Profiler · Discover your AI coding style",
    description:
      "Analyze your commit history to discover your Vibe Coding Profile (VCP) — patterns and insights grounded in evidence. Share your unique AI-era coding persona.",
    url: appUrl,
    locale: "en_US",
    type: "website",
    siteName: "Vibe Coding Profiler",
    images: [
      {
        url: `${appUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: "Vibe Coding Profiler - Discover your AI coding style",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Coding Profiler · Discover your AI coding style",
    description:
      "Analyze your commit history to discover your Vibe Coding Profile (VCP) — patterns and insights grounded in evidence. Share your unique AI-era coding persona.",
    images: [`${appUrl}/api/og`],
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
        {user ? (
          <JobsProvider>
            <AppHeader isAuthed={Boolean(user)} isAdmin={isAdmin} signOut={signOut} />
            {children}
          </JobsProvider>
        ) : (
          <>
            <AppHeader isAuthed={Boolean(user)} isAdmin={isAdmin} signOut={signOut} />
            {children}
          </>
        )}
        <Toaster />
      </body>
    </html>
  );
}
