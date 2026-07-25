import Link from "next/link";
import { listCommunities, listPolls } from "@/lib/db";
import { DropCap } from "@/components/DropCap";
import { Plate } from "@/components/Plate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const communities = await listCommunities();
  const allPolls = await listPolls();
  const activeProposals = allPolls.filter(
    (p) => Date.now() <= p.endTime && p.status !== "closed"
  );

  return (
    <>
      {/* HERO — drop-cap Λ + manuscript opening */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 lg:pt-28 pb-12 sm:pb-20">
          <p className="marginalia text-iron mb-6 reveal-1">
            ZuGov α · governance for the network state
          </p>
          <div className="grid md:grid-cols-12 gap-6 lg:gap-10 items-end">
            <div className="md:col-span-3 flex flex-col items-start md:items-center gap-6 reveal-1">
              <DropCap letter="Λ" />
            </div>
            <div className="md:col-span-9 reveal-2">
              <h1 className="font-display font-normal leading-[0.98] text-ink">
                The Lycian League,
                <br />
                <span className="italic text-iron">in protocol form.</span>
              </h1>
              <p className="lede mt-7 max-w-2xl">
                A civic governance protocol with an{" "}
                <em className="text-iron not-italic font-semibold">epistemic auditor</em> in
                front of every vote. Six votes for Patara, three for Tlos, one
                for Olympos — federation arithmetic from 200 BCE, executed in
                code.
              </p>
              <p className="font-display italic text-[20px] sm:text-[24px] text-iron-deep mt-4 max-w-2xl">
                Understanding before consensus.
              </p>
              <div className="mt-9 flex flex-wrap gap-3 reveal-3">
                <Link href="/proposals" className="btn-iron inline-flex items-center gap-2">
                  Read the folio →
                </Link>
                <Link href="/proposals/new" className="btn-outline inline-flex items-center">
                  Submit a question
                </Link>
              </div>
            </div>
          </div>

          {/* Stats + opening plate */}
          <div className="mt-16 sm:mt-20 grid md:grid-cols-12 gap-8 lg:gap-12 rule-thin pt-10 reveal-4">
            <div className="md:col-span-7 grid grid-cols-3 gap-6 sm:gap-10 self-start">
              <Stat n={communities.length} label="communities" />
              <Stat n={activeProposals.length} label="open questions" />
              <Stat n={allPolls.filter((p) => p.groundingReport).length} label="grounded" />
            </div>
            <div className="md:col-span-5">
              <Plate
                src="/img/patara-theater.jpg"
                alt="Aerial view of the bouleuterion at Patara"
                num="PLATE I"
                caption="Bouleuterion at Patara, c. 200 BCE — meeting place of the Lycian League's federal assembly. Eight kilometres from the present-day Web3 META Hub."
                ratio="wide"
              />
            </div>
          </div>
        </div>
      </section>

{/* TODAY'S QUESTIONS — folio-style listing */}
      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-6 mb-10">
            <div className="md:col-span-4">
              <p className="marginalia text-iron mb-2">Pars · I</p>
              <h2 className="font-display italic text-ink">Today.</h2>
            </div>
            <div className="md:col-span-8">
              <p className="lede max-w-prose">
                Questions in front of the assembly. Read the body. Run the
                audit. Then — and only then — vote.
              </p>
            </div>
          </div>

          {activeProposals.length === 0 ? (
            <p className="font-display italic text-[18px] text-ink-soft">
              No active questions. Quiet morning at the agora.
            </p>
          ) : (
            <ul className="space-y-0">
              {activeProposals.slice(0, 5).map((p, i) => {
                const community = communities.find((c) => c.id === p.communityId);
                const folioNum = String(i + 1).padStart(3, "0");
                return (
                  <li key={p.id} className={i === 0 ? "rule-thin" : ""}>
                    <Link
                      href={`/proposals/${p.id}`}
                      className="block py-6 sm:py-8 rule-thin grid md:grid-cols-12 gap-4 sm:gap-6 hover:bg-surface/40 transition px-2 -mx-2 group"
                    >
                      <div className="md:col-span-2">
                        <p className="folio-id">PROP · {folioNum}</p>
                        {community && (
                          <p className="mt-1 marginalia text-ink-muted">
                            {community.name}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-7">
                        <h3 className="font-display text-[24px] sm:text-[28px] leading-[1.15] text-ink group-hover:text-iron transition mb-2">
                          {p.title}
                        </h3>
                        <p className="text-[14px] sm:text-[15px] text-ink leading-[1.65] line-clamp-2">
                          {p.body}
                        </p>
                      </div>
                      <div className="md:col-span-3 md:text-right">
                        <p className="marginalia text-ink-muted">{p.proposalType}</p>
                        {p.groundingReport ? (
                          <p className="marginalia text-lichen mt-1">✓ audited</p>
                        ) : (
                          <p className="marginalia text-ink-muted/70 mt-1">◌ pending</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-10">
            <Link
              href="/proposals"
              className="marginalia text-iron link-underline hover:text-iron-deep"
            >
              read the full folio →
            </Link>
          </div>
        </div>
      </section>

{/* COMMUNITIES — laid as plates */}
      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-6 mb-12">
            <div className="md:col-span-4">
              <p className="marginalia text-iron mb-2">Pars · II</p>
              <h2 className="font-display italic text-ink">Chambers.</h2>
            </div>
            <div className="md:col-span-8">
              <p className="lede max-w-prose">
                Where the question lives. Each community sets its own
                eligibility, identity, and federation graph.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {communities.map((c, i) => {
              const cPolls = allPolls.filter((p) => p.communityId === c.id);
              return (
                <Link
                  key={c.id}
                  href={`/community/${c.slug}`}
                  className="group block"
                >
                  <article className="plate p-6 sm:p-8 hover:border-ink transition">
                    <p className="folio-id mb-4">
                      CHAMBER · {String(i + 1).padStart(2, "0")} · {c.category}
                    </p>
                    <h3 className="font-display text-[32px] sm:text-[40px] leading-[1.0] text-ink group-hover:text-iron transition mb-3">
                      {c.name}
                    </h3>
                    <p className="font-display italic text-[17px] text-ink-soft mb-4 leading-[1.4]">
                      &ldquo;{c.tagline}&rdquo;
                    </p>
                    <p className="text-[14px] text-ink leading-[1.7] mb-6">
                      {c.description}
                    </p>
                    <div className="flex gap-8 rule-thin pt-4">
                      <Stat n={cPolls.length} label="questions" small />
                      <Stat n={c.identityProviders.length} label="identity" small />
                      <Stat n={c.affiliations.length} label="federated" small />
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

{/* PLATE INTERLUDE — voting urns */}
      <section className="py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-5">
              <Plate
                src="/img/vote-pebbles.png"
                alt="Ancient citizen casting a pebble into voting urns marked NAI / OXI"
                num="PLATE II"
                caption="Pebble vote at the agora — citizens drop a stone into one of two urns: ναί (yes) or οὐχί (no). The original anonymous, single-use signature."
                ratio="wide"
              />
            </div>
            <div className="md:col-span-7 flex items-end">
              <p className="font-display italic text-[20px] sm:text-[24px] text-ink leading-[1.4] max-w-prose">
                &ldquo;Decision left the body and was pressed into a counted
                stone. Two thousand years later, Madison cited the model in
                Federalist No.&nbsp;9 — and we are still arguing about how to
                count better.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

{/* HOW IT WORKS — Roman numerated colophon */}
      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-6 mb-12">
            <div className="md:col-span-4">
              <p className="marginalia text-iron mb-2">Pars · III</p>
              <h2 className="font-display italic text-ink">Method.</h2>
            </div>
            <div className="md:col-span-8">
              <p className="text-[16px] text-ink leading-[1.6] max-w-prose">
                Three layers between a question and a vote. Reading is not
                optional. The auditor witnesses, never decides.
              </p>
            </div>
          </div>

          <ol className="space-y-0">
            {[
              {
                n: "I",
                title: "The question enters the chamber.",
                body:
                  "A member submits a proposal — title, body, options, eligibility. Stored, timestamped, immutable.",
              },
              {
                n: "II",
                title: "The Grounding Engine witnesses.",
                body:
                  "An LLM auditor reads the proposal. Surfaces assumptions, cites sources, names dissents, marks hidden risk. Zero veto. Zero vote.",
              },
              {
                n: "III",
                title: "The assembly decides.",
                body:
                  "After the audit and after reflection, eligible voters sign anonymously (ed25519 today, MACI ranked from July). Tally is public.",
              },
            ].map((s, idx) => (
              <li
                key={s.n}
                className={`grid md:grid-cols-12 gap-4 sm:gap-8 py-8 sm:py-10 ${
                  idx > 0 ? "rule-thin" : ""
                }`}
              >
                <div className="md:col-span-2">
                  <p className="font-display text-[56px] sm:text-[80px] leading-none text-iron font-normal">
                    {s.n}
                  </p>
                </div>
                <div className="md:col-span-10">
                  <h3 className="font-display text-[22px] sm:text-[28px] leading-[1.2] text-ink mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[15px] sm:text-[16px] text-ink leading-[1.72] max-w-2xl">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

function Stat({
  n,
  label,
  small,
}: {
  n: number;
  label: string;
  small?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-display font-normal leading-none text-ink ${
          small ? "text-[24px]" : "text-[32px] sm:text-[48px]"
        }`}
      >
        {n}
      </p>
      <p className="mt-1 marginalia text-ink-muted">{label}</p>
    </div>
  );
}
