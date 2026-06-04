import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONEPILOT",
  description: "Plateforme de pilotage projets, opérations, qualité et finance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}