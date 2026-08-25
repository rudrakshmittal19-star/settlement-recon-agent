import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Settlement Reconciliation Agent",
  description: "Reconciles Razorpay settlements against internal order ledger, with AI-assisted exception resolution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
