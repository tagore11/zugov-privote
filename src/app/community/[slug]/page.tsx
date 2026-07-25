import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommunity, listPolls } from "@/lib/db";
import { DropCap } from "@/components/DropCap";
import { Plate } from "@/components/Plate";

const LIVE_PROVIDERS = new Set([
  "MetaMask",
  "WalletConnect",
  "Coinbase",
  "Safe",
]);

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await getCommunity(slug);
  if (!community) notFound();
  const polls = await listPolls(community.id);
  const initial = community.name.charAt(0).toUpperCase();

  return (
    <>
      <section className="relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12">
          <Link
            href="/"
            className="marginalia text-ink link-underline reveal-1 inline-block mb-8"
          >
            ← back to the agora
          </Link>

          <div className="grid md:grid-cols-12 gap-6 lg:gap-12 items-start">
            <div className="md:col-span-3 reveal-1">
              <DropCap letter={initial} />
              <p className="folio-id mt-2">{community.category}</p>
            </div>
            <div className="md:col-span-9 reveal-2">
              <p className="marginalia text-iron mb-4">
                Chamber · /{community.slug}
              </p>
              <h1 className="font-display font-normal leading-[1.0] text-ink">
                {community.name}
              </h1>
              <p className="mt-6 font-display italic text-[20px] sm:text-[22px] text-ink-soft leading-[1.4] max-w-2xl">
                &ldquo;{community.tagline}&rdquo;
              </p>
              <p className="mt-7 text-[16px] sm:text-[17px] text-ink leading-[1.65] max-w-2xl">
                {community.description}
              </p>

              <div className="mt-10 grid sm:grid-cols-2 gap-6 rule-thin pt-6 reveal-3">
                <Field label="Federation">
                  <p className="text-[15px] text-ink">
                    {community.affiliations.length === 0
                      ? "Open to invites"
                      : `${community.affiliations.length} affiliated`}
                  </p>
                </Field>
                <Field label="Open questions">
                  <p className="font-display text-[48px] font-normal leading-none text-iron">
                    {polls.length}
                  </p>
                </Field>
              </div>

              <div className="mt-10 reveal-3">
                <p className="marginalia text-iron mb-4">
                  Identity providers · {community.identityProviders.length}
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {community.identityProviders.map((p) => {
                    const live = LIVE_PROVIDERS.has(p);
                    return (
                      <li
                        key={p}
                        className={`px-3 py-2.5 border text-[13px] flex items-center justify-between gap-2 ${
                          live
                            ? "border-ink bg-surface text-ink"
                            : "border-rule bg-canvas text-ink-muted"
                        }`}
                      >
                        <span className="font-medium">{p}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider">
                          {live ? "✓" : "soon"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 marginalia text-ink-muted normal-case tracking-normal text-[12px]">
                  <span className="lowercase">live now via RainbowKit · others swap in with MACI Layer 1–3 (July 2026)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 grid md:grid-cols-2 gap-6 lg:gap-10 reveal-3">
            <Plate
              src="/img/antiphellos-assembly.webp"
              alt="105 students gathered at the Antiphellos ancient theatre during Civilisation Kaş 3.0"
              num="PLATE I"
              caption="Antiphellos bouleuterion, Civilisation Kaş 3.0 — the first DAO workshop ever held in this 2,200-year-old chamber. February 2025."
              ratio="wide"
            />
            <Plate
              src="/img/yoga-antiphellos.webp"
              alt="Sunrise yoga at the Antiphellos ancient theatre"
              num="PLATE II"
              caption="Daily ritual at the Antiphellos chamber — sunrise yoga before the morning sprint. Body before code."
              ratio="wide"
            />
          </div>
        </div>
      </section>

<section className="py-10 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-10 flex-wrap gap-3">
            <h2 className="font-display italic text-ink">The folio.</h2>
            <Link href="/proposals/new" className="btn-outline">
              + Submit
            </Link>
          </div>

          {polls.length === 0 ? (
            <p className="font-display italic text-[16px] text-ink-soft">
              No open questions in this chamber yet.
            </p>
          ) : (
            <ul className="space-y-0">
              {polls.map((p, i) => {
                const ended =
                  Date.now() > p.endTime || p.status === "closed";
                return (
                  <li key={p.id}>
                    <Link
                      href={`/proposals/${p.id}`}
                      className="block py-6 sm:py-8 rule-thin grid md:grid-cols-12 gap-4 sm:gap-6 hover:bg-surface/40 transition px-2 -mx-2 group"
                    >
                      <div className="md:col-span-2">
                        <p className="folio-id">
                          PROP · {String(i + 1).padStart(3, "0")}
                        </p>
                      </div>
                      <div className="md:col-span-7">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span
                            className={`marginalia ${
                              ended ? "text-ink-muted" : "text-iron"
                            }`}
                          >
                            {ended ? "Closed" : "Open"}
                          </span>
                          <span className="marginalia text-ink-muted">
                            {p.proposalType}
                          </span>
                          {p.groundingReport && (
                            <span className="marginalia text-lichen">
                              ✓ audited
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-[22px] sm:text-[26px] leading-[1.2] text-ink group-hover:text-iron transition mb-2">
                          {p.title}
                        </h3>
                        <p className="text-[14px] text-ink leading-[1.65] line-clamp-2 max-w-2xl">
                          {p.body}
                        </p>
                      </div>
                      <div className="md:col-span-3 md:text-right space-y-1">
                        <p className="marginalia text-ink-muted">
                          {ended ? "ended" : "ends"}
                        </p>
                        <p className="font-display italic text-[14px] text-ink">
                          {new Date(p.endTime).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="marginalia text-ink-muted mb-2">{label}</p>
      {children}
    </div>
  );
}
