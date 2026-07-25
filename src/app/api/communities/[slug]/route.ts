import { NextRequest, NextResponse } from "next/server";
import { getCommunity, listPolls } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const community = await getCommunity(slug);
  if (!community) return NextResponse.json({ error: "not found" }, { status: 404 });
  const polls = await listPolls(community.id);
  return NextResponse.json({ community, polls });
}
