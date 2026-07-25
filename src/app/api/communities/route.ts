import { NextResponse } from "next/server";
import { listCommunities } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ communities: await listCommunities() });
}
