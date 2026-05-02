import { NextRequest, NextResponse } from "next/server";
import { getPoll, tallyPoll, closePoll } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Tally is hidden until the poll has ended (or coordinator force-closes via ?force=1).
 * MACI integration later: this becomes coordinator zk-decryption of encrypted votes.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const poll = getPoll(id);
  if (!poll) return NextResponse.json({ error: "not found" }, { status: 404 });

  const force = req.nextUrl.searchParams.get("force") === "1";
  const ended = Date.now() > poll.endTime || poll.status === "closed";

  if (!ended && !force) {
    return NextResponse.json(
      { sealed: true, endsAt: poll.endTime, message: "tally sealed until poll ends" },
      { status: 200 }
    );
  }

  if (force && poll.status !== "closed") {
    closePoll(poll.id);
  }

  const result = tallyPoll(id);
  return NextResponse.json({
    sealed: false,
    pollId: id,
    totals: result.totals,
    totalVotes: result.totalVotes,
    uniqueVoters: result.uniqueVoters,
    revealedAt: Date.now(),
  });
}
