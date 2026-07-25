"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import {
  loadOrCreateVoter,
  signVote,
  shortPub,
  VoterIdentity,
} from "@/lib/voter-client";
import type { Community, Poll, GroundingReportShape, Tally } from "@/lib/types";
import { Plate } from "@/components/Plate";

type TallyState =
  | Tally
  | { sealed: true; endsAt: number }
  | { totals: Record<string, number>; totalVotes: number; uniqueVoters: number };

type Tab = "read" | "audit" | "vote";

export default function ProposalClient({
  poll: initial,
  community,
}: {
  poll: Poll;
  community: Community | null;
}) {
  const [poll, setPoll] = useState<Poll>(initial);
  const [tab, setTab] = useState<Tab>("read");
  const [voter, setVoter] = useState<VoterIdentity | null>(null);
  const [groundingBusy, setGroundingBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteMsg, setVoteMsg] = useState<string | null>(null);
  const [tally, setTally] = useState<TallyState | null>(null);
  const [reflect, setReflect] = useState({ read: false, audit: false, weigh: false });
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const rippleKey = useRef(0);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => setVoter(loadOrCreateVoter()), []);

  const ended = Date.now() > poll.endTime || poll.status === "closed";
  const reflectionPassed = reflect.read && reflect.weigh;

  async function refreshPoll() {
    const r = await fetch(`/api/polls/${poll.id}`);
    if (r.ok) {
      const data = (await r.json()) as { poll: Poll };
      setPoll(data.poll);
    }
  }

  async function runGrounding() {
    setGroundingBusy(true);
    try {
      const r = await fetch(`/api/polls/${poll.id}/ground`, { method: "POST" });
      if (!r.ok) {
        const err = await r.json();
        alert("Grounding failed: " + (err.detail ?? err.error));
        return;
      }
      await refreshPoll();
    } finally {
      setGroundingBusy(false);
    }
  }

  async function castVote(choice: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      key: ++rippleKey.current,
    });
    setTimeout(() => setRipple(null), 700);

    setVoteBusy(true);
    setVoteMsg(null);
    try {
      let payload: { voterPubkey: string; signature: string; message: string };

      if (isConnected && address) {
        const message = JSON.stringify({
          pollId: poll.id,
          choice,
          ts: Date.now(),
        });
        const signature = await signMessageAsync({ message });
        payload = { voterPubkey: address, signature, message };
      } else {
        if (!voter) {
          setVoteMsg("Identity not ready.");
          return;
        }
        const signed = await signVote({
          identity: voter,
          pollId: poll.id,
          choice,
        });
        payload = {
          voterPubkey: voter.pubkeyHex,
          signature: signed.signature,
          message: signed.message,
        };
      }

      const r = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, ...payload }),
      });
      const data = await r.json();
      if (!r.ok) {
        setVoteMsg("Rejected: " + (data.error ?? r.status));
      } else {
        setVoteMsg(
          `Vote recorded · nullifier ${data.nullifier?.slice(0, 16)}…`
        );
        await loadTally(false);
      }
    } catch (err) {
      setVoteMsg(
        "Error: " + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setVoteBusy(false);
    }
  }

  async function loadTally(force: boolean) {
    const r = await fetch(
      `/api/polls/${poll.id}/tally${force ? "?force=1" : ""}`
    );
    const data = await r.json();
    setTally(data);
    if (force) await refreshPoll();
  }

  const identityLabel = isConnected && address
    ? `${address.slice(0, 6)}…${address.slice(-4)} · wallet`
    : voter
    ? `${shortPub(voter.pubkeyHex)} · local key`
    : "—";

  const tldr =
    poll.body.length > 220 ? poll.body.slice(0, 220).trim() + "…" : poll.body;

  return (
    <>
      {/* HEADER — manuscript folio opening */}
      <section className="relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6 reveal-1">
            {community && (
              <Link
                href={`/community/${community.slug}`}
                className="marginalia text-ink border border-rule px-2 py-1 hover:bg-ink hover:text-surface transition"
              >
                ← {community.name}
              </Link>
            )}
            <span
              className={`marginalia px-2 py-1 ${
                ended
                  ? "text-ink-muted bg-rule/40"
                  : "text-iron bg-iron/8"
              }`}
            >
              {ended ? "Closed" : "Open"}
            </span>
            <span className="marginalia text-ink-muted">{poll.proposalType}</span>
            <span className="marginalia text-ink-muted">{poll.privacy}</span>
          </div>

          <div className="grid md:grid-cols-12 gap-6 lg:gap-10 items-start reveal-2">
            <div className="md:col-span-2 hidden md:block">
              <span className="dropcap-letter" style={{ fontSize: "clamp(120px,16vw,200px)" }}>
                Π
              </span>
              <p className="folio-id mt-2">PROPOSAL</p>
            </div>
            <div className="md:col-span-10">
              <h1 className="font-display font-normal leading-[1.05] text-ink">
                {poll.title}
              </h1>
              <p className="mt-6 font-display italic text-[18px] sm:text-[20px] text-ink-soft leading-[1.5] max-w-3xl">
                {tldr}
              </p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 info reveal-3">
                <span>id · {poll.id}</span>
                <span>eligibility · {poll.eligibility}</span>
                <span>
                  {ended ? "ended" : "ends"}{" "}
                  {new Date(poll.endTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS — Roman numerals, sticky */}
      <div className="sticky top-14 z-30 bg-canvas/95 backdrop-blur border-y border-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex">
            <TabBtn current={tab} value="read" set={setTab} numeral="I" label="Read" />
            <TabBtn
              current={tab}
              value="audit"
              set={setTab}
              numeral="II"
              label={poll.groundingReport ? "Audit ✓" : "Audit"}
            />
            <TabBtn current={tab} value="vote" set={setTab} numeral="III" label="Vote" />
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <section className="py-10 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {tab === "read" && (
            <article className="grid md:grid-cols-12 gap-6 lg:gap-10">
              <div className="md:col-span-2">
                <p className="folio-id">FOLIO · I</p>
                <p className="marginalia text-ink-muted mt-2">The question</p>
              </div>
              <div className="md:col-span-10">
                <div className="text-[17px] sm:text-[18px] text-ink leading-[1.75] whitespace-pre-wrap max-w-prose">
                  {poll.body}
                </div>

                <div className="mt-12 grid sm:grid-cols-3 gap-6 rule-thin pt-6">
                  <Field label="Options">
                    <ul className="space-y-1 text-[15px] text-ink">
                      {poll.options.map((o) => (
                        <li key={o} className="font-display italic">· {o}</li>
                      ))}
                    </ul>
                  </Field>
                  <Field label="Eligibility">
                    <p className="text-[15px] text-ink">{poll.eligibility}</p>
                  </Field>
                  <Field label="Closes">
                    <p className="text-[15px] text-ink">
                      {new Date(poll.endTime).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </Field>
                </div>

                <div className="mt-12 max-w-md">
                  <Plate
                    src="/img/kas-coast.jpg"
                    alt="Kaş coast — the chamber's geographic context"
                    num="PLATE"
                    caption="The geography of the chamber — Kaş, southern Türkiye. Where this question is being weighed."
                    ratio="wide"
                  />
                </div>

                <div className="mt-10">
                  <button
                    onClick={() => setTab("audit")}
                    className="btn-outline"
                  >
                    Witness the audit →
                  </button>
                </div>
              </div>
            </article>
          )}

          {tab === "audit" && (
            <article className="grid md:grid-cols-12 gap-6 lg:gap-10">
              <div className="md:col-span-2">
                <p className="folio-id">FOLIO · II</p>
                <p className="marginalia text-ink-muted mt-2">The audit</p>
              </div>
              <div className="md:col-span-10">
                <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
                  <h2 className="font-display italic text-ink">
                    What the auditor sees.
                  </h2>
                  <button
                    onClick={runGrounding}
                    disabled={groundingBusy}
                    className="btn-outline"
                  >
                    {groundingBusy
                      ? "auditing…"
                      : poll.groundingReport
                      ? "re-run"
                      : "run audit"}
                  </button>
                </div>
                {poll.groundingReport ? (
                  <GroundingView report={poll.groundingReport} />
                ) : (
                  <div className="plate p-6 sm:p-8">
                    <p className="text-[16px] text-ink leading-[1.7] max-w-prose">
                      The Grounding Engine has not yet read this proposal.
                      Run the audit to surface{" "}
                      <em className="text-iron not-italic">assumptions</em>,{" "}
                      <em className="text-iron not-italic">sources</em>,{" "}
                      <em className="text-iron not-italic">dissents</em>, and{" "}
                      <em className="text-iron not-italic">hidden risk</em> —
                      before the assembly votes.
                    </p>
                    <p className="mt-5 marginalia text-ink-muted">
                      Zero veto · zero vote · only witness
                    </p>
                  </div>
                )}
              </div>
            </article>
          )}

          {tab === "vote" && (
            <article className="grid md:grid-cols-12 gap-6 lg:gap-10">
              <div className="md:col-span-2">
                <p className="folio-id">FOLIO · III</p>
                <p className="marginalia text-ink-muted mt-2">The decision</p>
              </div>
              <div className="md:col-span-10">
                <h2 className="font-display italic text-ink mb-3">
                  A moment of reflection.
                </h2>
                <p className="text-[15px] text-ink mb-7 max-w-prose leading-[1.6]">
                  The pebble does not return to the urn. Confirm what you have
                  considered before casting.
                </p>

                <ul className="space-y-2 mb-10 max-w-2xl">
                  {[
                    ["read", "I have read the body of this proposal."],
                    ["audit", "I have witnessed the Grounding audit (or accept its absence)."],
                    ["weigh", "I have weighed counter-arguments and risks."],
                  ].map(([key, label]) => {
                    const val = reflect[key as keyof typeof reflect];
                    return (
                      <li key={key as string}>
                        <button
                          type="button"
                          onClick={() =>
                            setReflect((s) => ({
                              ...s,
                              [key as string]: !s[key as keyof typeof s],
                            }))
                          }
                          className={`w-full text-left flex items-start gap-4 p-4 border transition ${
                            val
                              ? "border-iron bg-iron/5"
                              : "border-rule bg-surface hover:border-ink"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 mt-0.5 w-5 h-5 border flex items-center justify-center transition text-[12px] font-mono ${
                              val
                                ? "bg-iron border-iron text-surface"
                                : "border-ink-muted/50"
                            }`}
                          >
                            {val ? "✓" : ""}
                          </span>
                          <span className="text-[15px] text-ink leading-[1.5]">
                            {label as string}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="rule-thin pt-8">
                  <p className="marginalia text-ink-muted mb-2">Signing as</p>
                  <p className="info text-ink mb-6">{identityLabel}</p>

                  <div className="flex flex-wrap gap-3">
                    {poll.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={(e) => castVote(opt, e)}
                        disabled={voteBusy || ended || !reflectionPassed}
                        className={`relative overflow-hidden px-6 py-3.5 transition font-mono text-[13px] uppercase tracking-[0.18em] ${
                          reflectionPassed && !ended
                            ? "bg-iron text-surface hover:bg-iron-deep disabled:opacity-50"
                            : "border border-rule text-ink-muted cursor-not-allowed"
                        }`}
                      >
                        {opt}
                        {ripple && (
                          <span
                            key={ripple.key}
                            className="pebble-ripple"
                            style={{
                              left: ripple.x,
                              top: ripple.y,
                              width: 8,
                              height: 8,
                              marginLeft: -4,
                              marginTop: -4,
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  {!reflectionPassed && (
                    <p className="mt-4 marginalia text-ink-muted">
                      Confirm reflection above to cast.
                    </p>
                  )}
                  {ended && (
                    <p className="mt-4 marginalia text-ink-muted">
                      The chamber has closed.
                    </p>
                  )}
                  {voteMsg && (
                    <p
                      className={`mt-6 font-mono text-[12px] border-l-2 pl-3 py-2 ${
                        voteMsg.startsWith("Vote recorded")
                          ? "text-lichen border-lichen"
                          : "text-iron-deep border-iron"
                      }`}
                    >
                      {voteMsg}
                    </p>
                  )}
                </div>

                {/* Tally */}
                <div className="mt-14 rule-thin pt-8">
                  <div className="flex items-baseline justify-between mb-6">
                    <p className="marginalia text-iron">The count</p>
                    <button
                      onClick={() => loadTally(false)}
                      className="marginalia text-ink link-underline"
                    >
                      reveal
                    </button>
                  </div>
                  {tally ? (
                    <TallyView tally={tally} options={poll.options} />
                  ) : (
                    <p className="font-display italic text-[15px] text-ink-muted">
                      Sealed. Reveal to see the count.
                    </p>
                  )}
                </div>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}

function TabBtn({
  current,
  value,
  set,
  numeral,
  label,
}: {
  current: Tab;
  value: Tab;
  set: (t: Tab) => void;
  numeral: string;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => set(value)}
      className={`flex items-baseline gap-3 px-5 sm:px-7 py-4 transition border-b-2 -mb-px whitespace-nowrap ${
        active
          ? "border-iron text-ink"
          : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      <span
        className={`font-display text-[18px] ${
          active ? "text-iron italic" : "text-ink-muted"
        }`}
      >
        {numeral}
      </span>
      <span className="font-mono text-[12px] uppercase tracking-[0.18em]">
        {label}
      </span>
    </button>
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

function GroundingView({ report }: { report: GroundingReportShape }) {
  return (
    <div className="space-y-6">
      <div className="plate p-6 sm:p-8">
        <p className="folio-id mb-4">EXECUTIVE</p>
        <p className="text-[16px] sm:text-[17px] text-ink leading-[1.7] max-w-prose">
          {report.executiveSummary}
        </p>
        <p className="mt-5 marginalia text-ink-muted">
          keywords · {report.keywords.join(" · ")} · engine {report.engine} ·{" "}
          {report.model}
        </p>
      </div>
      <div className="space-y-0">
        {Object.entries(report.questions).map(([key, section], i) => (
          <details
            key={key}
            className={`group ${i > 0 ? "rule-thin" : ""}`}
          >
            <summary className="px-1 py-5 cursor-pointer flex items-baseline gap-4 hover:text-iron transition">
              <span className="folio-id text-iron flex-shrink-0">
                Q · {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-[18px] sm:text-[20px] text-ink flex-1 leading-[1.3]">
                {section.question}
              </span>
              <span className="text-ink-muted group-open:rotate-180 transition flex-shrink-0">▾</span>
            </summary>
            <ul className="pb-6 pl-12 space-y-2 text-[15px] text-ink-soft leading-[1.65]">
              {section.observations.map((o, idx) => (
                <li key={idx} className="list-['—__'] -ml-4">
                  {o}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

function TallyView({
  tally,
  options,
}: {
  tally: TallyState;
  options: string[];
}) {
  if ("sealed" in tally && tally.sealed) {
    return (
      <p className="font-display italic text-[15px] text-ink-muted">
        Sealed until{" "}
        {new Date((tally as { endsAt: number }).endsAt).toLocaleString()}.
      </p>
    );
  }
  const t = tally as {
    totals: Record<string, number>;
    totalVotes: number;
    uniqueVoters: number;
  };
  return (
    <div className="space-y-4">
      <p className="marginalia text-ink-muted">
        {t.totalVotes} pebbles · {t.uniqueVoters} unique voter
        {t.uniqueVoters === 1 ? "" : "s"}
      </p>
      {options.map((opt) => {
        const count = t.totals[opt] ?? 0;
        const pct = t.totalVotes ? (count / t.totalVotes) * 100 : 0;
        return (
          <div key={opt}>
            <div className="flex justify-between text-[14px] mb-2 text-ink items-baseline">
              <span className="font-display italic">{opt}</span>
              <span className="font-mono text-[12px]">
                {count} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-[3px] bg-rule/60 overflow-hidden">
              <div
                className="h-full bg-iron transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
