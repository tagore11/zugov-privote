"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadOrCreateVoter,
  signVote,
  shortPub,
  VoterIdentity,
} from "@/lib/voter-client";
import type { Poll, GroundingReportShape, Tally } from "@/lib/types";

export default function PollClient({ poll: initialPoll }: { poll: Poll }) {
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [voter, setVoter] = useState<VoterIdentity | null>(null);
  const [groundingBusy, setGroundingBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteMsg, setVoteMsg] = useState<string | null>(null);
  const [tally, setTally] = useState<Tally | { sealed: true; endsAt: number } | null>(null);

  useEffect(() => setVoter(loadOrCreateVoter()), []);

  const ended = Date.now() > poll.endTime || poll.status === "closed";

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

  async function castVote(choice: string) {
    if (!voter) return;
    setVoteBusy(true);
    setVoteMsg(null);
    try {
      const signed = await signVote({ identity: voter, pollId: poll.id, choice });
      const r = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice,
          voterPubkey: voter.pubkeyHex,
          signature: signed.signature,
          message: signed.message,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setVoteMsg("Reddedildi: " + (data.error ?? r.status));
      } else {
        setVoteMsg(`Oy kaydedildi · nullifier ${data.nullifier.slice(0, 16)}…`);
      }
    } catch (err) {
      setVoteMsg("Hata: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setVoteBusy(false);
    }
  }

  async function loadTally(force: boolean) {
    const r = await fetch(`/api/polls/${poll.id}/tally${force ? "?force=1" : ""}`);
    const data = await r.json();
    setTally(data);
    if (force) await refreshPoll();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← all polls
        </Link>
        <h1 className="text-2xl font-mono mt-2">{poll.title}</h1>
        <div className="text-xs font-mono text-zinc-500 mt-1 flex gap-4">
          <span>id {poll.id}</span>
          <span>ends {new Date(poll.endTime).toLocaleString()}</span>
          <span className={ended ? "text-zinc-500" : "text-emerald-400"}>
            {ended ? "closed" : "active"}
          </span>
        </div>
      </div>

      <section className="border border-zinc-800 bg-zinc-900/30 rounded p-4 whitespace-pre-wrap text-sm">
        {poll.body}
      </section>

      <section className="border border-cyan-900/40 bg-cyan-950/10 rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-mono text-cyan-300">Grounding Report</h2>
          <button
            onClick={runGrounding}
            disabled={groundingBusy}
            className="text-xs border border-cyan-700 text-cyan-300 px-3 py-1 rounded hover:bg-cyan-950/40 disabled:opacity-50"
          >
            {groundingBusy
              ? "Auditing… (qwen2.5:7b ~60-120s)"
              : poll.groundingReport
              ? "Re-run"
              : "Run grounding"}
          </button>
        </div>
        {poll.groundingReport ? (
          <GroundingView report={poll.groundingReport} />
        ) : (
          <p className="text-sm text-zinc-500">
            Henüz çalışmadı. "Run grounding" tuşuyla yerel modeli (Ollama) tetikle.
          </p>
        )}
      </section>

      <section className="border border-amber-900/40 bg-amber-950/10 rounded p-4">
        <h2 className="font-mono text-amber-300 mb-3">Cast Vote</h2>
        {voter && (
          <div className="text-xs font-mono text-zinc-500 mb-3">
            voter key: {shortPub(voter.pubkeyHex)}
            <span className="text-zinc-600"> · anonymous, signed locally</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {poll.options.map((opt) => (
            <button
              key={opt}
              onClick={() => castVote(opt)}
              disabled={voteBusy || ended}
              className="px-4 py-2 border border-amber-700 hover:bg-amber-950/40 rounded text-sm font-medium disabled:opacity-40"
            >
              {opt}
            </button>
          ))}
        </div>
        {voteMsg && (
          <p className="text-xs font-mono mt-3 text-zinc-300">{voteMsg}</p>
        )}
      </section>

      <section className="border border-zinc-800 rounded p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono">Tally</h2>
          <div className="flex gap-2">
            <button
              onClick={() => loadTally(false)}
              className="text-xs border border-zinc-700 px-3 py-1 rounded hover:bg-zinc-800"
            >
              View
            </button>
            <button
              onClick={() => loadTally(true)}
              className="text-xs border border-red-900 text-red-300 px-3 py-1 rounded hover:bg-red-950/40"
            >
              Force-close (coordinator)
            </button>
          </div>
        </div>
        {tally && <TallyView tally={tally} options={poll.options} />}
      </section>
    </div>
  );
}

function GroundingView({ report }: { report: GroundingReportShape }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-zinc-200">{report.executiveSummary}</p>
      <p className="text-xs text-zinc-500 font-mono">
        keywords: {report.keywords.join(", ")} · engine {report.engine} ·{" "}
        {report.model}
      </p>
      <div className="space-y-3 mt-3">
        {Object.entries(report.questions).map(([key, section]) => (
          <details
            key={key}
            className="border border-zinc-800 rounded bg-zinc-900/40"
          >
            <summary className="px-3 py-2 cursor-pointer text-zinc-300 font-mono text-xs">
              [{key}] {section.question}
            </summary>
            <ul className="px-4 pb-3 list-disc list-inside text-zinc-400 space-y-1 text-sm">
              {section.observations.map((o, i) => (
                <li key={i}>{o}</li>
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
  tally: Tally | { sealed: true; endsAt: number } | { sealed?: boolean; totals?: Record<string, number>; totalVotes?: number; uniqueVoters?: number };
  options: string[];
}) {
  if ("sealed" in tally && tally.sealed) {
    return (
      <p className="text-sm text-zinc-500 mt-3">
        Sealed until {new Date((tally as { endsAt: number }).endsAt).toLocaleString()}.
      </p>
    );
  }
  const t = tally as { totals: Record<string, number>; totalVotes: number; uniqueVoters: number };
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p className="text-xs text-zinc-500 font-mono">
        {t.totalVotes} votes · {t.uniqueVoters} unique voters
      </p>
      {options.map((opt) => {
        const count = t.totals[opt] ?? 0;
        const pct = t.totalVotes ? (count / t.totalVotes) * 100 : 0;
        return (
          <div key={opt}>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>{opt}</span>
              <span>
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded">
              <div
                className="h-2 bg-amber-500 rounded"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
