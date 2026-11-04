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
  description:
    "Berðu saman verð á farsímum í rauntíma hjá ELKO, Nova, Símanum, Sýn, Emobi, Mi búðinni og öllum helstu verslunum á Íslandi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="is"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("color-scheme");var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=s||"light dark";var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
