import type { Metadata } from "next";
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
  title: "Bolokono · Understand your coding vibe",
  description:
    "Bolokono analyzes your GitHub history to reveal commit rhythm, build categories, and narratives that describe how you build software without exposing raw files.",
  themeColor: "#050505",
  metadataBase: new URL("http://localhost:8108"),
  openGraph: {
    title: "Bolokono · Coding craftsmanship, surfaced",
    description:
      "Metrics-first insight into your solo building patterns. Bolokono computes rhythm, categories, and narratives from commit history.",
    url: "https://www.bolokonon.app",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bolokono · Understand your coding vibe",
    description:
      "Solo-focused analytics that turn commits into a narrative of how you build software.",
  },
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
