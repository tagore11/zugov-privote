import Link from "next/link";
import { listPolls, listCommunities } from "@/lib/db";
import { DropCap } from "@/components/DropCap";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const [polls, communities] = await Promise.all([
    listPolls(),
    listCommunities(),
  ]);
  const cMap = new Map(communities.map((c) => [c.id, c]));

  return (
    <>
      <section className="relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-10">
          <div className="grid md:grid-cols-12 gap-6 lg:gap-10 items-end">
            <div className="md:col-span-3 reveal-1">
              <DropCap letter="Π" />
            </div>
            <div className="md:col-span-9 reveal-2">
              <p className="marginalia text-iron mb-4">
                The folio · {polls.length} entries
              </p>
              <h1 className="font-display font-normal leading-[1.0] text-ink">
                Questions in front
                <br />
                <span className="italic">of the assembly.</span>
              </h1>
              <p className="lede mt-7 max-w-2xl">
                Read the body. Witness the audit. Then — and only then — cast.
              </p>
            </div>
          </div>
        </div>
      </section>

<section className="py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {polls.length === 0 ? (
            <p className="font-display italic text-[17px] text-ink-soft">
              The folio is empty.
            </p>
          ) : (
            <ul className="space-y-0">
              {polls.map((p, i) => {
                const ended = Date.now() > p.endTime || p.status === "closed";
                const community = cMap.get(p.communityId);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/proposals/${p.id}`}
                      className="block py-7 sm:py-9 rule-thin grid md:grid-cols-12 gap-4 sm:gap-8 hover:bg-surface/40 transition px-2 -mx-2 group"
                    >
                      <div className="md:col-span-2">
                        <p className="folio-id text-iron">
                          PROP · {String(i + 1).padStart(3, "0")}
                        </p>
                        {community && (
                          <p className="mt-1.5 marginalia text-ink-muted">
                            {community.name}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-7">
                        <div className="flex flex-wrap gap-3 mb-3">
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
                          <span className="marginalia text-ink-muted">
                            {p.privacy}
                          </span>
                          {p.groundingReport && (
                            <span className="marginalia text-lichen">
                              ✓ audited
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-[24px] sm:text-[30px] leading-[1.15] text-ink group-hover:text-iron transition mb-2">
                          {p.title}
                        </h3>
                        <p className="text-[14px] sm:text-[15px] text-ink leading-[1.65] line-clamp-2 max-w-2xl">
                          {p.body}
                        </p>
                      </div>
                      <div className="md:col-span-3 md:text-right">
                        <p className="marginalia text-ink-muted">
                          {ended ? "ended" : "ends"}
                        </p>
                        <p className="font-display italic text-[16px] text-ink mt-0.5">
                          {new Date(p.endTime).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
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
