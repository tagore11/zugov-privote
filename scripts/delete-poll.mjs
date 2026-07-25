#!/usr/bin/env node
/**
 * Delete one or more polls (proposals) by id.
 *
 * Usage:
 *   node scripts/delete-poll.mjs <id1> [id2] [id3] ...
 *
 * Reads DATABASE_URL from .env.local. Deletes votes for the poll first
 * (FK), then the poll. Idempotent — silently skips ids that don't exist.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

// Load .env.local
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("usage: node scripts/delete-poll.mjs <id1> [id2] ...");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

try {
  for (const id of ids) {
    const existed = await sql`SELECT title FROM polls WHERE id = ${id}`;
    if (existed.length === 0) {
      console.log(`✗ ${id}  (not found, skipped)`);
      continue;
    }
    const title = existed[0].title;
    await sql`DELETE FROM votes WHERE poll_id = ${id}`;
    await sql`DELETE FROM polls WHERE id = ${id}`;
    console.log(`✓ deleted  ${id}  "${title}"`);
  }
} finally {
  await sql.end();
}
