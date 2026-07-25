import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TinyWins",
  description: "Start small. Finish honest.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen flex flex-col">
        <main className="flex-1 max-w-md mx-auto w-full px-4 pb-24 pt-8">
          {children}
        </main>
        <nav className="fixed bottom-0 left-0 right-0 bg-paper border-t border-moss-200">
          <div className="max-w-md mx-auto flex justify-around py-3 text-sm font-medium text-moss-700">
            <Link href="/today">Today</Link>
            <Link href="/coach">Coach</Link>
            <Link href="/rewards">Rewards</Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
