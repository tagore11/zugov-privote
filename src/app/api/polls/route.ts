import { NextRequest, NextResponse } from "next/server";
import { listPolls, createPoll } from "@/lib/db";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ polls: listPolls() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    text,
    options,
    coordinatorPubkey,
    durationMinutes,
  } = body as {
    title?: string;
    text?: string;
    options?: string[];
    coordinatorPubkey?: string;
    durationMinutes?: number;
  };

  if (!title || !text || !coordinatorPubkey) {
    return NextResponse.json(
      { error: "title, text, coordinatorPubkey required" },
      { status: 400 }
    );
  }

  const id = randomBytes(8).toString("hex");
  const now = Date.now();
  const duration = (durationMinutes ?? 60) * 60_000;

  const poll = createPoll({
    id,
    title,
    body: text,
    options:
      options && options.length >= 2 ? options : ["yes", "no", "abstain"],
    coordinatorPubkey,
    startTime: now,
    endTime: now + duration,
  });

  return NextResponse.json({ poll });
}
