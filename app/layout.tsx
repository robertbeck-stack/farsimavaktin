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
  title: "Farsímavaktin 🇮🇸 | Verðsamanburður á farsímum á Íslandi",
  description: "Berðu saman verð á farsímum í rauntíma hjá ELKO, Vodafone, Mi búðinni, Coolshop og öllum helstu verslunum á Íslandi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="is" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
