import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "beeple — delegated agent payments",
  description: "Devnet-only hierarchical authority at the x402 payment boundary",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
