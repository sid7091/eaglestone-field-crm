import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eagle Stone ERP - Marble Manufacturing",
  description: "ERP System for Eagle Stone - Marble Importers and Manufacturers, Ongole",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
