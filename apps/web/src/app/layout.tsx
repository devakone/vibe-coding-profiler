import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bolokono · Understand your vibe coding profile",
  description:
    "Bolokono analyzes your GitHub history to generate a vibe profile, persona snapshot, and narratives with evidence SHAs.",
  metadataBase: new URL("http://localhost:8108"),
  openGraph: {
    title: "Bolokono · Vibe coding profile, surfaced",
    description:
      "Vibe profiles and personas grounded in commit history metrics and evidence SHAs.",
    url: "https://www.bolokonon.app",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bolokono · Understand your coding vibe",
    description:
      "Solo-focused vibe profiles and personas grounded in commit evidence.",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
