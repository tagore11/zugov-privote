import { NextRequest, NextResponse } from "next/server";
import { getPoll, recordVote, hasVoted } from "@/lib/db";
import { verifyVoteSignature, deriveNullifier } from "@/lib/crypto-server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const poll = getPoll(id);
  if (!poll) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (poll.status === "closed" || Date.now() > poll.endTime) {
    return NextResponse.json({ error: "poll closed" }, { status: 400 });
  }

  const body = (await req.json()) as {
    choice?: string;
    voterPubkey?: string;
    signature?: string;
    message?: string;
  };
  const { choice, voterPubkey, signature, message } = body;

  if (!choice || !voterPubkey || !signature || !message) {
    return NextResponse.json(
      { error: "choice, voterPubkey, signature, message required" },
      { status: 400 }
    );
  }
  if (!poll.options.includes(choice)) {
    return NextResponse.json({ error: "invalid choice" }, { status: 400 });
  }

  // Validate the message ties to this poll + choice (prevent replay onto another poll).
  let parsed: { pollId?: string; choice?: string };
  try {
    parsed = JSON.parse(message);
  } catch {
    return NextResponse.json(
      { error: "malformed message" },
      { status: 400 }
    );
  }
  if (parsed.pollId !== id || parsed.choice !== choice) {
    return NextResponse.json(
      { error: "message does not match poll/choice" },
      { status: 400 }
    );
  }

  const ok = await verifyVoteSignature({
    message,
    signatureHex: signature,
    pubkeyHex: voterPubkey,
  });
  if (!ok) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const nullifier = deriveNullifier(voterPubkey, id);
  if (hasVoted(id, nullifier)) {
    return NextResponse.json({ error: "already voted" }, { status: 409 });
  }

  const result = recordVote({
    pollId: id,
    choice,
    voterPubkey,
    nullifier,
    signature,
    message,
    submittedAt: Date.now(),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({ ok: true, nullifier });
}
