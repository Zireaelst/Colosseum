import type { Metadata } from "next";

import "./globals.css";
import "./product.css";
import { SolanaProvider } from "./solana-provider";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000",
  ),
  title: "Pactlet — Permission before payment",
  description: "Task-scoped budgets and backend-enforced delegated authority for AI agent payments on Solana devnet.",
  keywords: ["AI agents", "x402", "Solana devnet", "delegated authority", "agent payments"],
  openGraph: {
    title: "Pactlet — Let agents pay. You set the limits.",
    description: "Task-scoped authority enforced at the x402 payment boundary.",
    images: [{ url: "/brand/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pactlet — Permission before payment",
    description: "Task-scoped authority enforced at the x402 payment boundary.",
    images: ["/brand/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#000", color: "#fff" }}><SolanaProvider>{children}</SolanaProvider></body>
    </html>
  );
}
