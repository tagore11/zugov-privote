export type PollStatus = "active" | "closed";

export interface Poll {
  id: string;
  title: string;
  body: string;
  options: string[]; // e.g. ["yes","no","abstain"]
  coordinatorPubkey: string;
  startTime: number;
  endTime: number;
  status: PollStatus;
  createdAt: number;
  groundingReport: GroundingReportShape | null;
}

export interface GroundingReportShape {
  generatedAt: string;
  executiveSummary: string;
  keywords: string[];
  questions: Record<
    string,
    { question: string; observations: string[] }
  >;
  engine: "local" | "claude";
  model: string;
}

export interface VoteRecord {
  id: number;
  pollId: string;
  choice: string;
  voterPubkey: string;
  nullifier: string;
  signature: string;
  message: string;
  submittedAt: number;
}

export interface Tally {
  pollId: string;
  totals: Record<string, number>;
  totalVotes: number;
  uniqueVoters: number;
  revealedAt: number | null;
}
