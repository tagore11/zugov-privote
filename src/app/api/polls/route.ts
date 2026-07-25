import { NextRequest, NextResponse } from "next/server";
import { listPolls, createPoll, ZUKAS } from "@/lib/db";
import type { ProposalPrivacy, ProposalType } from "@/lib/types";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const community = searchParams.get("community") ?? undefined;
  return NextResponse.json({ polls: await listPolls(community) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    text,
    options,
    coordinatorPubkey,
    durationMinutes,
    communityId,
    proposalType,
    privacy,
    eligibility,
  } = body as {
    title?: string;
    text?: string;
    options?: string[];
    coordinatorPubkey?: string;
    durationMinutes?: number;
    communityId?: string;
    proposalType?: ProposalType;
    privacy?: ProposalPrivacy;
    eligibility?: string;
  };

  if (!title || !text || !coordinatorPubkey) {
    return NextResponse.json(
      { error: "title, text, coordinatorPubkey required" },
      { status: 400 }
    );
  }

  const id = randomBytes(8).toString("hex");
  const now = Date.now();
  const duration = (durationMinutes ?? 7 * 24 * 60) * 60_000;

  const poll = await createPoll({
    id,
    title,
    body: text,
    options:
      options && options.length >= 2 ? options : ["yes", "no", "abstain"],
    coordinatorPubkey,
    startTime: now,
    endTime: now + duration,
    communityId: communityId ?? ZUKAS,
    proposalType: proposalType ?? "offchain",
    privacy: privacy ?? "public",
    eligibility: eligibility ?? "Any verified Genesis Node",
  });

  return NextResponse.json({ poll });
}
