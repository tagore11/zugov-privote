#!/usr/bin/env node
/**
 * Updates the ZuKaş 2026 community to use the full 9-provider identity list.
 * Idempotent — safe to run multiple times.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const PROVIDERS = [
  "MetaMask",
  "WalletConnect",
  "Coinbase",
  "Safe",
  "Zupass",
  "Gitcoin Passport",
  "EAS",
  "World ID",
  "Token & NFT Gating",
];

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

try {
  const r = await sql`
    UPDATE communities
    SET identity_providers = ${sql.json(PROVIDERS)}
    WHERE id = 'zukas-2026'
    RETURNING id, name, identity_providers
  `;
  if (r.length === 0) {
    console.log("✗ zukas-2026 community not found");
  } else {
    console.log(`✓ updated ${r[0].name}`);
    console.log(`  providers: ${PROVIDERS.join(", ")}`);
  }
} finally {
  await sql.end();
}
