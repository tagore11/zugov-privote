"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadOrCreateVoter, shortPub, VoterIdentity } from "@/lib/voter-client";

export default function NewPollPage() {
  const router = useRouter();
  const [voter, setVoter] = useState<VoterIdentity | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setVoter(loadOrCreateVoter()), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!voter) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          text: body,
          coordinatorPubkey: voter.pubkeyHex,
          durationMinutes: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "create failed");
      router.push(`/polls/${data.poll.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-mono">New Poll</h1>

      {voter && (
        <div className="text-xs font-mono text-zinc-500 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/30">
          coordinator key: {shortPub(voter.pubkeyHex)}
          <span className="text-zinc-600"> · stored in localStorage</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={10}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:border-amber-500 outline-none font-mono text-sm"
            placeholder="Full proposal text. The Grounding Engine will audit it."
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
            className="w-32 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:border-amber-500 outline-none"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 border border-red-900/40 bg-red-950/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !voter}
          className="bg-amber-500 text-zinc-950 px-4 py-2 rounded font-medium hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create poll"}
        </button>
      </form>
    </div>
  );
}
