import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZuGov Privote",
  description: "Anonymous voting with local epistemic auditor.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 px-6 py-4">
          <nav className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/" className="font-mono text-lg tracking-tight">
              ZuGov<span className="text-amber-400">.privote</span>
            </Link>
            <div className="flex gap-6 text-sm text-zinc-400">
              <Link href="/" className="hover:text-zinc-100">Polls</Link>
              <Link href="/polls/new" className="hover:text-zinc-100">New</Link>
              <Link href="/coordinator" className="hover:text-zinc-100">Coordinator</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-zinc-800 px-6 py-4 text-xs text-zinc-500 font-mono">
          <div className="max-w-5xl mx-auto flex justify-between">
            <span>local-first · ed25519 · qwen2.5:7b</span>
            <span>MACI-ready stub</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
