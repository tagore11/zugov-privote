export type PollStatus = "active" | "closed";
export type ProposalType = "onchain" | "offchain";
export type ProposalPrivacy = "public" | "private";

export interface Community {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: "Residency" | "Regional" | "Network State" | "Social";
  identityProviders: string[];
  affiliations: string[]; // community ids
  createdAt: number;
}

export interface Poll {
  id: string;
  title: string;
  body: string;
  options: string[];
  coordinatorPubkey: string;
  startTime: number;
  endTime: number;
  status: PollStatus;
  createdAt: number;
  groundingReport: GroundingReportShape | null;
  // Extended (proposal-shaped) fields
  communityId: string;
  proposalType: ProposalType;
  privacy: ProposalPrivacy;
  eligibility: string;
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
