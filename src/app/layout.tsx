import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kamatelier.com"),
  title: {
    default: "Kamatelier",
    template: "%s | Kamatelier",
  },
  description: "Suivez la rentabilité de vos crafts, achats et ventes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_CA",
    url: "/",
    siteName: "Kamatelier",
    title: "Kamatelier",
    description: "Suivez la rentabilité de vos crafts, achats et ventes.",
  },
  twitter: {
    card: "summary",
    title: "Kamatelier",
    description: "Suivez la rentabilité de vos crafts, achats et ventes.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
