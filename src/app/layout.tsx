import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TinyWins",
  description: "An AI coach that helps you start, verifies you finished, and pays you in points.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
