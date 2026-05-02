import Database from "better-sqlite3";
import path from "node:path";
import { Poll, VoteRecord, GroundingReportShape, PollStatus } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "privote.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;

  // Ensure data dir exists.
  const fs = require("node:fs") as typeof import("node:fs");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  init(_db);
  return _db;
}

function init(d: Database.Database) {
  d.exec(`
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_nullifier
      ON votes(poll_id, nullifier);

    CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
  `);
}

function rowToPoll(row: Record<string, unknown>): Poll {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    options: JSON.parse(row.options as string) as string[],
    coordinatorPubkey: row.coordinator_pubkey as string,
    startTime: row.start_time as number,
    endTime: row.end_time as number,
    status: row.status as PollStatus,
    createdAt: row.created_at as number,
    groundingReport: row.grounding_report
      ? (JSON.parse(row.grounding_report as string) as GroundingReportShape)
      : null,
  };
}

export function listPolls(): Poll[] {
  const rows = db()
    .prepare("SELECT * FROM polls ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToPoll);
}

export function getPoll(id: string): Poll | null {
  const row = db()
    .prepare("SELECT * FROM polls WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToPoll(row) : null;
}

export function createPoll(input: Omit<Poll, "createdAt" | "groundingReport" | "status">): Poll {
  const now = Date.now();
  db()
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
  return getPoll(input.id)!;
}

export function attachGroundingReport(
  pollId: string,
  report: GroundingReportShape
): void {
  db()
    .prepare("UPDATE polls SET grounding_report = ? WHERE id = ?")
    .run(JSON.stringify(report), pollId);
}

export function closePoll(pollId: string): void {
  db().prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(pollId);
}

export function recordVote(input: Omit<VoteRecord, "id">): { ok: true } | { ok: false; reason: string } {
  try {
    db()
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

export function tallyPoll(pollId: string): {
  totals: Record<string, number>;
  totalVotes: number;
  uniqueVoters: number;
} {
  const rows = db()
    .prepare("SELECT choice, voter_pubkey FROM votes WHERE poll_id = ?")
    .all(pollId) as Array<{ choice: string; voter_pubkey: string }>;
  const totals: Record<string, number> = {};
  const voters = new Set<string>();
  for (const r of rows) {
    totals[r.choice] = (totals[r.choice] ?? 0) + 1;
    voters.add(r.voter_pubkey);
  }
  return { totals, totalVotes: rows.length, uniqueVoters: voters.size };
}

export function hasVoted(pollId: string, nullifier: string): boolean {
  const row = db()
    .prepare("SELECT 1 FROM votes WHERE poll_id = ? AND nullifier = ?")
    .get(pollId, nullifier);
  return Boolean(row);
}
