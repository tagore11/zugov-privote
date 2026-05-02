/**
 * Local Grounding Engine — open-weights, locally-run inference.
 * Mirrors @zugov/sdk grounding-engine/local.ts. Inlined here because Turbopack
 * struggles with file:-linked CJS packages; once the SDK is published to npm
 * or shipped via a Next-friendly bundle, this file gets replaced by a re-export.
 *
 * Vitalik's "crypto + AI applications" (Jan 2024): AI inside a governance system
 * must be runnable by participants, not gated behind a closed API.
 * Reproducibility: temperature=0 + fixed seed so any community member can re-run
 * the same proposal on their own machine and verify the report.
 */

export interface ProposalInput {
  id?: string;
  title?: string;
  text: string;
  tags?: string[];
}

export type EpistemicQuestionKey =
  | "assumptions"
  | "baseRates"
  | "counterarguments"
  | "reversibility"
  | "affectedParties"
  | "precedents";

export interface GroundingSection {
  question: string;
  observations: string[];
}

export interface GroundingReport {
  proposalId?: string;
  title?: string;
  generatedAt: string;
  executiveSummary: string;
  keywords: string[];
  questions: Record<EpistemicQuestionKey, GroundingSection>;
}

export interface LocalGroundingConfig {
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  seed?: number;
  temperature?: number;
  apiKey?: string;
}

const DEFAULT_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_MODEL = "qwen2.5:7b";
const DEFAULT_MAX_TOKENS = 3072;
const DEFAULT_SEED = 42;

const GROUNDING_SYSTEM_PROMPT = `You are the Grounding Engine, an epistemic auditor for governance proposals.
You have ZERO voting power. ZERO veto. You never say a proposal is good or bad.
Your job: surface what the proposal does NOT address.

For each proposal, answer exactly 6 structured questions.
Output valid JSON matching this schema:
{
  "executiveSummary": "2-sentence factual summary of what the proposal does",
  "keywords": ["top", "5", "themes"],
  "questions": {
    "assumptions": { "question": "What does this proposal assume to be true?", "observations": ["...", "..."] },
    "baseRates": { "question": "What is the historical base rate of similar decisions?", "observations": ["...", "..."] },
    "counterarguments": { "question": "Which counterarguments are absent from the proposal text?", "observations": ["...", "..."] },
    "reversibility": { "question": "How reversible is this decision, and at what cost?", "observations": ["...", "..."] },
    "affectedParties": { "question": "Who is affected by this decision, and how?", "observations": ["...", "..."] },
    "precedents": { "question": "How have similar communities resolved comparable decisions?", "observations": ["...", "..."] }
  }
}

Each observation should be 1-2 sentences, specific, and grounded in the proposal text.
Your last line must always be: "This report is for epistemic foundation. The decision belongs to the community."
Include this as the final observation in the precedents section.`;

export async function analyzeProposalLocally(
  input: ProposalInput,
  config?: LocalGroundingConfig
): Promise<GroundingReport> {
  const baseUrl = (config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = config?.model ?? DEFAULT_MODEL;
  const maxTokens = config?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const seed = config?.seed ?? DEFAULT_SEED;
  const temperature = config?.temperature ?? 0;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config?.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      seed,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GROUNDING_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LocalInferenceError(
      `Local inference failed: ${response.status} ${response.statusText}`,
      body
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new GroundingParseError(
      "Local inference returned empty content",
      JSON.stringify(payload)
    );
  }

  const parsed = parseGroundingResponse(text);
  return {
    proposalId: input.id,
    title: input.title,
    generatedAt: new Date().toISOString(),
    executiveSummary: parsed.executiveSummary,
    keywords: parsed.keywords,
    questions: parsed.questions,
  };
}

function buildUserMessage(input: ProposalInput): string {
  const parts: string[] = [];
  if (input.title) parts.push(`## Proposal Title\n${input.title}`);
  parts.push(`## Proposal Text\n${input.text}`);
  if (input.tags && input.tags.length > 0) {
    parts.push(`## Tags\n${input.tags.join(", ")}`);
  }
  parts.push(
    "\nAnalyze this proposal using the 6 structured epistemic questions. Return valid JSON only."
  );
  return parts.join("\n\n");
}

function parseGroundingResponse(text: string): {
  executiveSummary: string;
  keywords: string[];
  questions: Record<EpistemicQuestionKey, GroundingSection>;
} {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new GroundingParseError("No JSON object found in LLM response", text);
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new GroundingParseError("Invalid JSON in LLM response", text);
  }

  const executiveSummary =
    typeof parsed.executiveSummary === "string"
      ? parsed.executiveSummary
      : "Analysis could not generate a summary.";

  const keywords = Array.isArray(parsed.keywords)
    ? (parsed.keywords as unknown[])
        .filter((k): k is string => typeof k === "string")
        .slice(0, 10)
    : [];

  const questionKeys: EpistemicQuestionKey[] = [
    "assumptions",
    "baseRates",
    "counterarguments",
    "reversibility",
    "affectedParties",
    "precedents",
  ];

  const rawQuestions =
    typeof parsed.questions === "object" && parsed.questions !== null
      ? (parsed.questions as Record<string, unknown>)
      : {};

  const questions = {} as Record<EpistemicQuestionKey, GroundingSection>;
  for (const key of questionKeys) {
    const raw = rawQuestions[key] as Record<string, unknown> | undefined;
    questions[key] = {
      question:
        typeof raw?.question === "string"
          ? raw.question
          : `[${key}] question not generated`,
      observations: Array.isArray(raw?.observations)
        ? (raw.observations as unknown[]).filter(
            (o): o is string => typeof o === "string"
          )
        : [`No observations generated for ${key}.`],
    };
  }

  return { executiveSummary, keywords, questions };
}

export class GroundingParseError extends Error {
  public readonly rawResponse: string;
  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = "GroundingParseError";
    this.rawResponse = rawResponse;
  }
}

export class LocalInferenceError extends Error {
  public readonly responseBody: string;
  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "LocalInferenceError";
    this.responseBody = responseBody;
  }
}
