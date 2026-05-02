/**
 * Storage layer.
 *
 * Two backends behind one async API:
 *   - Postgres (postgres.js) when DATABASE_URL is set. This is the prod path
 *     against Neon and what Vercel will use.
 *   - better-sqlite3 (file at data/privote.db) for local dev when no
 *     DATABASE_URL. Exists so a contributor can `npm run dev` offline.
 *
 * Same export shape, different bodies. Callers always `await`.
 */

import path from "node:path";
import fs from "node:fs";
import postgres from "postgres";
import type {
  GroundingReportShape,
  Poll,
  PollStatus,
  VoteRecord,
} from "./types";

type Sql = ReturnType<typeof postgres>;

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
  return _sql;
}

async function migratePg(sql: Sql): Promise<void> {
  if (_initialized) return;
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
  _initialized = true;
}

function sqlite(): import("better-sqlite3").Database {
  if (_sqlite) return _sqlite;
  // Lazy-require so deployments without sqlite installed still boot.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const dbPath = path.join(process.cwd(), "data", "privote.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const inst = new Database(dbPath) as import("better-sqlite3").Database;
  inst.pragma("journal_mode = WAL");
  inst.exec(`
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
      grounding_report TEXT
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
  `);
  _sqlite = inst;
  return inst;
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
  };
}

export async function listPolls(): Promise<Poll[]> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM polls ORDER BY created_at DESC
    `;
    return rows.map(rowToPoll);
  }
  const rows = sqlite()
    .prepare("SELECT * FROM polls ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToPoll);
}

export async function getPoll(id: string): Promise<Poll | null> {
  if (usePostgres()) {
    const sql = await pg();
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM polls WHERE id = ${id}
    `;
    return rows[0] ? rowToPoll(rows[0]) : null;
  }
  const row = sqlite()
    .prepare("SELECT * FROM polls WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToPoll(row) : null;
}

export async function createPoll(
  input: Omit<Poll, "createdAt" | "groundingReport" | "status">
): Promise<Poll> {
  const now = Date.now();
  if (usePostgres()) {
    const sql = await pg();
    await sql`
      INSERT INTO polls (id, title, body, options, coordinator_pubkey, start_time, end_time, status, created_at)
      VALUES (
        ${input.id}, ${input.title}, ${input.body},
        ${sql.json(input.options)},
        ${input.coordinatorPubkey}, ${input.startTime}, ${input.endTime},
        'active', ${now}
      )
    `;
  } else {
    sqlite()
      .prepare(
        `INSERT INTO polls (id, title, body, options, coordinator_pubkey, start_time, end_time, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      )
      .run(
        input.id,
        input.title,
        input.body,
        JSON.stringify(input.options),
        input.coordinatorPubkey,
        input.startTime,
        input.endTime,
        now
      );
  }
  const poll = await getPoll(input.id);
  return poll!;
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
        return { ok: false, reason: "Already voted on this poll" };
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
      return { ok: false, reason: "Already voted on this poll" };
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

export async function hasVoted(
  pollId: string,
  nullifier: string
): Promise<boolean> {
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
