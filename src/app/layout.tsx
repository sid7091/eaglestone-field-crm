import type { Metadata } from "next";
import "./globals.css";
import SWRegister from "./sw-register";

export const metadata: Metadata = {
  title: "Eaglestone Field CRM",
  description: "Field CRM for marble and stone industry representatives",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EagleCRM",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // Ensure the browser uses the manifest theme colour in the chrome UI.
    "msapplication-TileColor": "#1a1a2e",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Explicit manifest link — belt-and-suspenders alongside metadata.manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8B6914" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-sans antialiased">
        {children}
        {/* Register the service worker on the client; renders nothing. */}
        <SWRegister />
      </body>
    </html>
  );
}
