import path from "node:path";
import fs from "node:fs";
import postgres from "postgres";
import type {
  Community,
  GroundingReportShape,
  Poll,
  PollStatus,
  ProposalPrivacy,
  ProposalType,
  VoteRecord,
} from "./types";

type Sql = ReturnType<typeof postgres>;

const ZUKAS_COMMUNITY_ID = "zukas-2026";

let _sql: Sql | null = null;
let _sqlite: import("better-sqlite3").Database | null = null;
let _initialized = false;

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function pg(): Promise<Sql> {
  if (_sql) return _sql;
  _sql = postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  await migratePg(_sql);
  await seedPg(_sql);
  return _sql;
}

async function migratePg(sql: Sql): Promise<void> {
  if (_initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      identity_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
      affiliations JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      options JSONB NOT NULL,
      coordinator_pubkey TEXT NOT NULL,
      start_time BIGINT NOT NULL,
      end_time BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at BIGINT NOT NULL,
      grounding_report JSONB
    )
  `;
  // Add proposal-shaped columns if missing (idempotent)
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS community_id TEXT`;
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS proposal_type TEXT NOT NULL DEFAULT 'offchain'`;
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'public'`;
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS eligibility TEXT NOT NULL DEFAULT 'Any verified Genesis Node'`;
  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id BIGSERIAL PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id),
      choice TEXT NOT NULL,
      voter_pubkey TEXT NOT NULL,
      nullifier TEXT NOT NULL,
      signature TEXT NOT NULL,
      message TEXT NOT NULL,
      submitted_at BIGINT NOT NULL,
      UNIQUE(poll_id, nullifier)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_polls_community ON polls(community_id)`;
  _initialized = true;
}

let _seeded = false;
async function seedPg(sql: Sql): Promise<void> {
  if (_seeded) return;
  const existing = await sql`SELECT id FROM communities WHERE id = ${ZUKAS_COMMUNITY_ID}`;
  if (existing.length === 0) {
    const now = Date.now();
    await sql`
      INSERT INTO communities
        (id, slug, name, tagline, description, category, identity_providers, affiliations, created_at)
      VALUES (
        ${ZUKAS_COMMUNITY_ID},
        'zukas-2026',
        'ZuKaş 2026',
        'A residency for pressing the fourth abstraction.',
        'Twelve-day pop-up city in Kaş, Türkiye (Sept 9-20, 2026). Genesis Nodes co-live to forge — and stress-test — the wisdom abstraction at the geography that pressed the previous three: token, coin, vote.',
        'Residency',
        ${sql.json(["MetaMask", "WalletConnect", "Coinbase", "Safe", "Zupass", "Gitcoin Passport", "EAS", "World ID", "Token & NFT Gating"])},
        ${sql.json([])},
        ${now}
      )
    `;

    // Seed 3 real proposals
    const seed = [
      {
        id: "p-glen-weyl-extension",
        title: "Extend Glen Weyl's residency to two weeks",
        body:
          "Glen confirmed one week with family. Should we offer a second-week extension covering travel + lodging, in exchange for two co-led workshops on Plural Money mechanism design? Funding source: protocol treasury (~$8K). Trade-off: shifts one Visiting Resident slot.",
        options: ["yes — offer extension", "no — keep one week", "abstain"],
        type: "offchain" as ProposalType,
        eligibility: "Any verified Genesis Node",
      },
      {
        id: "p-grounding-engine-v1",
        title: "Approve Grounding Engine v1 spec for closing release",
        body:
          "Lock the v1 spec for Grounding Engine: source-citation requirement, dissent-trail format, and the audit-log schema. Once approved we ship under MIT and freeze API surface until v2 (post-residency).",
        options: ["approve v1", "request changes", "abstain"],
        type: "onchain" as ProposalType,
        eligibility: "Genesis Nodes with Layer 0 contributor flag",
      },
      {
        id: "p-closing-assembly-patara",
        title: "Hold the closing assembly at the Patara bouleuterion",
        body:
          "Day 16 closing ceremony: in the bouleuterion of Patara (8 km from Kaş, where the Lycian League actually convened), Genesis Nodes sign the v1 release. Alternative: Antiphellos theatre, more accessible. Site visit logistics + permits for Patara are confirmed but tighter.",
        options: ["Patara — original site", "Antiphellos — accessible", "abstain"],
        type: "offchain" as ProposalType,
        eligibility: "Any verified Genesis Node",
      },
    ];

    for (const p of seed) {
      await sql`
        INSERT INTO polls
          (id, title, body, options, coordinator_pubkey, start_time, end_time, status, created_at, community_id, proposal_type, privacy, eligibility)
        VALUES (
          ${p.id}, ${p.title}, ${p.body},
          ${sql.json(p.options)},
          'seed-coordinator',
          ${now}, ${now + 7 * 24 * 3600 * 1000},
          'active', ${now},
          ${ZUKAS_COMMUNITY_ID},
          ${p.type}, 'public', ${p.eligibility}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }
  _seeded = true;
}

function sqlite(): import("better-sqlite3").Database {
  if (_sqlite) return _sqlite;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const dbPath = path.join(process.cwd(), "data", "privote.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const inst = new Database(dbPath) as import("better-sqlite3").Database;
  inst.pragma("journal_mode = WAL");
  inst.exec(`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      identity_providers TEXT NOT NULL DEFAULT '[]',
      affiliations TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      options TEXT NOT NULL,
      coordinator_pubkey TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      grounding_report TEXT,
      community_id TEXT,
      proposal_type TEXT NOT NULL DEFAULT 'offchain',
      privacy TEXT NOT NULL DEFAULT 'public',
      eligibility TEXT NOT NULL DEFAULT 'Any verified Genesis Node'
    );
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id TEXT NOT NULL,
      choice TEXT NOT NULL,
      voter_pubkey TEXT NOT NULL,
      nullifier TEXT NOT NULL,
      signature TEXT NOT NULL,
      message TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_nullifier ON votes(poll_id, nullifier);
    CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
    CREATE INDEX IF NOT EXISTS idx_polls_community ON polls(community_id);
  `);
  // Idempotent column adds for legacy sqlite dbs
  for (const stmt of [
    "ALTER TABLE polls ADD COLUMN community_id TEXT",
    "ALTER TABLE polls ADD COLUMN proposal_type TEXT NOT NULL DEFAULT 'offchain'",
    "ALTER TABLE polls ADD COLUMN privacy TEXT NOT NULL DEFAULT 'public'",
    "ALTER TABLE polls ADD COLUMN eligibility TEXT NOT NULL DEFAULT 'Any verified Genesis Node'",
  ]) {
    try { inst.exec(stmt); } catch { /* already exists */ }
  }
  _sqlite = inst;
  // Seed sqlite
  const row = inst.prepare("SELECT id FROM communities WHERE id = ?").get(ZUKAS_COMMUNITY_ID);
  if (!row) {
    const now = Date.now();
    inst.prepare(`
      INSERT INTO communities (id, slug, name, tagline, description, category, identity_providers, affiliations, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ZUKAS_COMMUNITY_ID, "zukas-2026", "ZuKaş 2026",
      "A residency for pressing the fourth abstraction.",
      "Twelve-day pop-up city in Kaş, Türkiye (Sept 9-20, 2026).",
      "Residency",
      JSON.stringify(["MetaMask", "WalletConnect", "Zupass"]),
      JSON.stringify([]),
      now
    );
  }
  return inst;
}

function rowToCommunity(row: Record<string, unknown>): Community {
  const ip = typeof row.identity_providers === "string"
    ? JSON.parse(row.identity_providers as string)
    : (row.identity_providers as string[]);
  const aff = typeof row.affiliations === "string"
    ? JSON.parse(row.affiliations as string)
    : (row.affiliations as string[]);
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: row.tagline as string,
    description: row.description as string,
    category: row.category as Community["category"],
    identityProviders: ip,
    affiliations: aff,
    createdAt: Number(row.created_at),
  };
}

function rowToPoll(row: Record<string, unknown>): Poll {
  const options =
    typeof row.options === "string"
      ? (JSON.parse(row.options as string) as string[])
      : (row.options as string[]);
  const grounding =
    row.grounding_report == null
      ? null
      : typeof row.grounding_report === "string"
      ? (JSON.parse(row.grounding_report as string) as GroundingReportShape)
      : (row.grounding_report as GroundingReportShape);
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    options,
    coordinatorPubkey: row.coordinator_pubkey as string,
    startTime: Number(row.start_time),
    endTime: Number(row.end_time),
    status: row.status as PollStatus,
    createdAt: Number(row.created_at),
    groundingReport: grounding,
    communityId: (row.community_id as string) ?? ZUKAS_COMMUNITY_ID,
    proposalType: ((row.proposal_type as ProposalType) ?? "offchain"),
    privacy: ((row.privacy as ProposalPrivacy) ?? "public"),
    eligibility: (row.eligibility as string) ?? "Any verified Genesis Node",
  };
}

export async function listCommunities(): Promise<Community[]> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Record<string, unknown>[]>`SELECT * FROM communities ORDER BY created_at DESC`;
    return rows.map(rowToCommunity);
  }
  const rows = sqlite()
    .prepare("SELECT * FROM communities ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToCommunity);
}

export async function getCommunity(idOrSlug: string): Promise<Community | null> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM communities WHERE id = ${idOrSlug} OR slug = ${idOrSlug} LIMIT 1
    `;
    return rows[0] ? rowToCommunity(rows[0]) : null;
  }
  const row = sqlite()
    .prepare("SELECT * FROM communities WHERE id = ? OR slug = ? LIMIT 1")
    .get(idOrSlug, idOrSlug) as Record<string, unknown> | undefined;
  return row ? rowToCommunity(row) : null;
}

export async function listPolls(communityId?: string): Promise<Poll[]> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = communityId
      ? await sql<Record<string, unknown>[]>`SELECT * FROM polls WHERE community_id = ${communityId} ORDER BY created_at DESC`
      : await sql<Record<string, unknown>[]>`SELECT * FROM polls ORDER BY created_at DESC`;
    return rows.map(rowToPoll);
  }
  const rows = communityId
    ? (sqlite()
        .prepare("SELECT * FROM polls WHERE community_id = ? ORDER BY created_at DESC")
        .all(communityId) as Record<string, unknown>[])
    : (sqlite()
        .prepare("SELECT * FROM polls ORDER BY created_at DESC")
        .all() as Record<string, unknown>[]);
  return rows.map(rowToPoll);
}

export async function getPoll(id: string): Promise<Poll | null> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Record<string, unknown>[]>`SELECT * FROM polls WHERE id = ${id}`;
    return rows[0] ? rowToPoll(rows[0]) : null;
  }
  const row = sqlite()
    .prepare("SELECT * FROM polls WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToPoll(row) : null;
}

type CreatePollInput = Omit<Poll, "createdAt" | "groundingReport" | "status"> & {
  communityId: string;
  proposalType: ProposalType;
  privacy: ProposalPrivacy;
  eligibility: string;
};

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const now = Date.now();
  if (usePostgres()) {
    const sql = await pg();
    await sql`
      INSERT INTO polls
        (id, title, body, options, coordinator_pubkey, start_time, end_time, status, created_at, community_id, proposal_type, privacy, eligibility)
      VALUES (
        ${input.id}, ${input.title}, ${input.body},
        ${sql.json(input.options)},
        ${input.coordinatorPubkey}, ${input.startTime}, ${input.endTime},
        'active', ${now},
        ${input.communityId}, ${input.proposalType}, ${input.privacy}, ${input.eligibility}
      )
    `;
  } else {
    sqlite()
      .prepare(
        `INSERT INTO polls (id, title, body, options, coordinator_pubkey, start_time, end_time, status, created_at, community_id, proposal_type, privacy, eligibility)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.title,
        input.body,
        JSON.stringify(input.options),
        input.coordinatorPubkey,
        input.startTime,
        input.endTime,
        now,
        input.communityId,
        input.proposalType,
        input.privacy,
        input.eligibility
      );
  }
  return (await getPoll(input.id))!;
}

export async function attachGroundingReport(
  pollId: string,
  report: GroundingReportShape
): Promise<void> {
  if (usePostgres()) {
    const sql = await pg();
    await sql`UPDATE polls SET grounding_report = ${sql.json(
      JSON.parse(JSON.stringify(report))
    )} WHERE id = ${pollId}`;
    return;
  }
  sqlite()
    .prepare("UPDATE polls SET grounding_report = ? WHERE id = ?")
    .run(JSON.stringify(report), pollId);
}

export async function closePoll(pollId: string): Promise<void> {
  if (usePostgres()) {
    const sql = await pg();
    await sql`UPDATE polls SET status = 'closed' WHERE id = ${pollId}`;
    return;
  }
  sqlite().prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(pollId);
}

export async function recordVote(
  input: Omit<VoteRecord, "id">
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (usePostgres()) {
    const sql = await pg();
    try {
      await sql`
        INSERT INTO votes (poll_id, choice, voter_pubkey, nullifier, signature, message, submitted_at)
        VALUES (
          ${input.pollId}, ${input.choice}, ${input.voterPubkey},
          ${input.nullifier}, ${input.signature}, ${input.message}, ${input.submittedAt}
        )
      `;
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return { ok: false, reason: "Already voted on this proposal" };
      }
      return { ok: false, reason: msg };
    }
  }
  try {
    sqlite()
      .prepare(
        `INSERT INTO votes (poll_id, choice, voter_pubkey, nullifier, signature, message, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.pollId,
        input.choice,
        input.voterPubkey,
        input.nullifier,
        input.signature,
        input.message,
        input.submittedAt
      );
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return { ok: false, reason: "Already voted on this proposal" };
    }
    return { ok: false, reason: msg };
  }
}

export async function tallyPoll(pollId: string): Promise<{
  totals: Record<string, number>;
  totalVotes: number;
  uniqueVoters: number;
}> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Array<{ choice: string; voter_pubkey: string }>>`
      SELECT choice, voter_pubkey FROM votes WHERE poll_id = ${pollId}
    `;
    return foldTally(rows);
  }
  const rows = sqlite()
    .prepare("SELECT choice, voter_pubkey FROM votes WHERE poll_id = ?")
    .all(pollId) as Array<{ choice: string; voter_pubkey: string }>;
  return foldTally(rows);
}

function foldTally(rows: Array<{ choice: string; voter_pubkey: string }>) {
  const totals: Record<string, number> = {};
  const voters = new Set<string>();
  for (const r of rows) {
    totals[r.choice] = (totals[r.choice] ?? 0) + 1;
    voters.add(r.voter_pubkey);
  }
  return { totals, totalVotes: rows.length, uniqueVoters: voters.size };
}

export async function hasVoted(pollId: string, nullifier: string): Promise<boolean> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Array<{ exists: boolean }>>`
      SELECT 1 AS exists FROM votes WHERE poll_id = ${pollId} AND nullifier = ${nullifier}
    `;
    return rows.length > 0;
  }
  const row = sqlite()
    .prepare("SELECT 1 FROM votes WHERE poll_id = ? AND nullifier = ?")
    .get(pollId, nullifier);
  return Boolean(row);
}

export const ZUKAS = ZUKAS_COMMUNITY_ID;
