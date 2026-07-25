"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadOrCreateVoter } from "@/lib/voter-client";
import type { Community, ProposalType, ProposalPrivacy } from "@/lib/types";

export default function NewProposalForm({
  communities,
}: {
  communities: Community[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [optionsRaw, setOptionsRaw] = useState("yes\nno\nabstain");
  const [proposalType, setProposalType] = useState<ProposalType>("offchain");
  const [privacy, setPrivacy] = useState<ProposalPrivacy>("public");
  const [eligibility, setEligibility] = useState("Any verified Genesis Node");
  const [durationDays, setDurationDays] = useState(7);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const voter = loadOrCreateVoter();
      const options = optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2) {
        setError("At least two options required.");
        setBusy(false);
        return;
      }
      const r = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          text,
          options,
          coordinatorPubkey: voter.pubkeyHex,
          durationMinutes: durationDays * 24 * 60,
          communityId,
          proposalType,
          privacy,
          eligibility,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? `HTTP ${r.status}`);
        return;
      }
      router.push(`/proposals/${data.poll.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <Field label="Chamber">
        <select
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          className="input"
          required
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="The question">
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is the assembly being asked to decide?"
          className="input input-display"
        />
      </Field>

      <Field
        label="The body"
        hint="Be precise. State the trade-off, the funding source, the alternative."
      >
        <textarea
          required
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Context. Trade-offs. Constraints."
          className="input"
        />
      </Field>

      <Field label="Options · one per line · two minimum">
        <textarea
          rows={4}
          value={optionsRaw}
          onChange={(e) => setOptionsRaw(e.target.value)}
          className="input font-mono"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-6">
        <Field label="Type">
          <select
            value={proposalType}
            onChange={(e) => setProposalType(e.target.value as ProposalType)}
            className="input"
          >
            <option value="offchain">Off-chain · signaling</option>
            <option value="onchain">On-chain · executable</option>
          </select>
        </Field>
        <Field label="Privacy">
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as ProposalPrivacy)}
            className="input"
          >
            <option value="public">Public</option>
            <option value="private">Private · chamber-only</option>
          </select>
        </Field>
      </div>

      <Field label="Eligibility">
        <input
          type="text"
          value={eligibility}
          onChange={(e) => setEligibility(e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Open for · days">
        <input
          type="number"
          min={1}
          max={30}
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
          className="input max-w-[140px]"
        />
      </Field>

      {error && (
        <div className="border-l-2 border-iron pl-4 py-2 font-mono text-[12px] text-iron-deep">
          {error}
        </div>
      )}

      <div className="pt-4 flex flex-wrap gap-4 items-center rule-thin">
        <button type="submit" disabled={busy} className="btn-iron mt-6">
          {busy ? "submitting…" : "submit"}
        </button>
        <span className="marginalia text-ink-muted mt-6">
          ed25519 stub · MACI swap July 2026
        </span>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 14px 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-rule);
          border-radius: 2px;
          color: var(--color-ink);
          font-size: 16px;
          line-height: 1.55;
          font-family: var(--font-body);
        }
        .input-display {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 400;
          padding: 16px 18px;
        }
        .input:focus {
          outline: none;
          border-color: var(--color-ink);
          background: #fff;
        }
        textarea.input {
          resize: vertical;
          line-height: 1.7;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="marginalia text-iron block mb-3">{label}</span>
      {children}
      {hint && (
        <span className="block mt-2 marginalia text-ink-muted normal-case tracking-normal text-[12px]">
          <span className="italic font-display tracking-normal not-italic">{hint}</span>
        </span>
      )}
    </label>
  );
}
