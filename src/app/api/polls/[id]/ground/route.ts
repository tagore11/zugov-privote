import { NextRequest, NextResponse } from "next/server";
import { getPoll, attachGroundingReport } from "@/lib/db";
import { analyzeProposalLocally } from "@/lib/grounding-local";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const poll = await getPoll(id);
  if (!poll) return NextResponse.json({ error: "not found" }, { status: 404 });

  const baseUrl =
    process.env.LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LLM_MODEL ?? "qwen2.5:7b";
  const apiKey = process.env.LLM_API_KEY;

  try {
    const t0 = Date.now();
    const report = await analyzeProposalLocally(
      {
        id: poll.id,
        title: poll.title,
        text: poll.body,
      },
      { baseUrl, model, apiKey, maxTokens: 3072 }
    );
    const ms = Date.now() - t0;
    const stored = {
      generatedAt: report.generatedAt,
      executiveSummary: report.executiveSummary,
      keywords: report.keywords,
      questions: report.questions,
      engine: "local" as const,
      model,
    };
    await attachGroundingReport(poll.id, stored);
    return NextResponse.json({ report: stored, latencyMs: ms });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "grounding failed", detail: msg },
      { status: 500 }
    );
  }
}
