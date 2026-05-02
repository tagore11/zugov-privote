"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadOrCreateVoter, shortPub, VoterIdentity } from "@/lib/voter-client";
import type { Poll } from "@/lib/types";

export default function CoordinatorPage() {
  const [voter, setVoter] = useState<VoterIdentity | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    setVoter(loadOrCreateVoter());
    fetch("/api/polls")
      .then((r) => r.json())
      .then((d) => setPolls(d.polls ?? []));
  }, []);

  const mine = voter
    ? polls.filter((p) => p.coordinatorPubkey === voter.pubkeyHex)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-mono">Coordinator</h1>
      {voter && (
        <div className="text-xs font-mono text-zinc-500 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/30">
          your key: {shortPub(voter.pubkeyHex)}
          <span className="text-zinc-600">
            {" "}
            · MACI integration replaces this with a coordinator role with
            zk-decryption rights
          </span>
        </div>
      )}

      <section>
        <h2 className="font-mono text-amber-300 mb-3">Polls You Created</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-zinc-500">
            None yet. Create one from{" "}
            <Link href="/polls/new" className="text-amber-400 hover:underline">
              /polls/new
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.map((p) => (
              <li
                key={p.id}
                className="border border-zinc-800 rounded p-3 flex items-baseline justify-between"
              >
                <div>
                  <Link
                    href={`/polls/${p.id}`}
                    className="font-medium hover:text-amber-300"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs font-mono text-zinc-500">
                    id {p.id} · ends{" "}
                    {new Date(p.endTime).toLocaleString()}
                  </p>
                </div>
                <span
                  className={
                    "text-xs font-mono px-2 py-0.5 rounded " +
                    (p.status === "closed"
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-emerald-900/40 text-emerald-300")
                  }
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-zinc-800 rounded p-4 text-xs text-zinc-500 font-mono space-y-1">
        <p>local-first build · today's MVP</p>
        <p>
          Crypto: ed25519 sign+verify, sha256 nullifier. Voter pubkey is the
          stable identity, nullifier prevents double-vote.
        </p>
        <p>
          Path forward: swap signing for MACI keypair, swap nullifier for
          Poseidon-in-circuit, swap tally for coordinator zk-decryption.
        </p>
      </section>
    </div>
  );
}
