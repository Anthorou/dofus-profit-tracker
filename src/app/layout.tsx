import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dofus Profit Tracker",
  description: "Suivez la rentabilité de vos crafts et achats-reventes Dofus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
