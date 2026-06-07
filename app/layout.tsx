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
  metadataBase: new URL("https://app-precios-five.vercel.app"),
  title: "El Nono Coqui",
  description: "Lista de precios de El Nono Coqui",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "El Nono Coqui",
    description: "Lista de precios de El Nono Coqui",
    url: "/",
    siteName: "El Nono Coqui",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "El Nono Coqui",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "El Nono Coqui",
    description: "Lista de precios de El Nono Coqui",
    images: ["/logo.png"],
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased notranslate`}
    >
      <body translate="no" className="min-h-full flex flex-col notranslate">
        {children}
      </body>
    </html>
  );
}
