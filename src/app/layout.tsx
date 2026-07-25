import type { Metadata } from "next";
import { EB_Garamond, Manrope, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { WalletButton } from "@/components/WalletButton";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZuGov — the Lycian League, in protocol form",
  description:
    "A civic governance protocol with an epistemic auditor before every vote. Understanding before consensus. ZuKaş 2026 pilot.",
};

const navLinks = [
  { href: "/", label: "Agora" },
  { href: "/proposals", label: "Proposals" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${manrope.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Web3Provider>
          <header className="sticky top-0 z-40 bg-canvas/92 backdrop-blur border-b border-rule">
            <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
              <Link
                href="/"
                className="flex items-baseline gap-2 hover:opacity-70 transition"
              >
                <span className="font-display text-[22px] font-medium text-ink leading-none italic">
                  ZuGov
                </span>
                <span className="marginalia text-iron">Λυκία · α</span>
              </Link>
              <ul className="hidden md:flex items-center gap-1">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="px-3 py-1.5 marginalia text-ink-soft hover:text-ink transition whitespace-nowrap"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2">
                <Link
                  href="/proposals/new"
                  className="hidden sm:inline-block px-3 py-1.5 marginalia border border-ink text-ink hover:bg-ink hover:text-surface transition whitespace-nowrap"
                >
                  + Submit
                </Link>
                <WalletButton />
              </div>
            </nav>
          </header>

          <main className="flex-1 pb-20 md:pb-0">{children}</main>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-rule safe-bottom">
            <ul className="grid grid-cols-3">
              {[
                { href: "/", label: "Agora" },
                { href: "/proposals", label: "Folio" },
                { href: "/proposals/new", label: "Submit" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center justify-center py-3 text-ink hover:bg-canvas transition marginalia"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <footer className="bg-lapis text-surface mt-24 hidden md:block relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
              <div className="grid md:grid-cols-12 gap-10 items-start">
                <div className="md:col-span-7">
                  <p className="marginalia text-rule mb-4">Λυκία · the assembly, in code</p>
                  <h3 className="font-display text-[36px] leading-[1.05] font-normal italic text-surface">
                    Six votes for Patara,
                    <br />
                    three for Tlos,
                    <br />
                    one for Olympos.
                  </h3>
                  <p className="mt-6 text-[14px] text-rule leading-[1.65] max-w-md not-italic">
                    Federation by formula since 200 BCE — re-implemented with an
                    epistemic auditor in front of every vote.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <p className="marginalia text-rule mb-3">Stack</p>
                  <ul className="space-y-1.5 text-[13px] text-surface/90">
                    <li>Layer 0 · Grounding Engine</li>
                    <li>Layer 1–3 · MACI · Öznur Kalkar</li>
                    <li>Layer 4 · Federation graph</li>
                    <li>Layer 5 · Editorial UI</li>
                  </ul>
                  <p className="mt-8 marginalia text-rule">α · ZuKaş pilot · Sept 9–20 2026</p>
                </div>
              </div>
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  );
}
