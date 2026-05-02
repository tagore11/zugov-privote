import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

ed.hashes.sha512 = sha512;

const POLL_ID = process.argv[2];
const CHOICE = process.argv[3] ?? "yes";
const BASE = "http://localhost:3000";

if (!POLL_ID) {
  console.error("Usage: node scripts/smoke-vote.mjs <pollId> [choice]");
  process.exit(1);
}

const priv = ed.utils.randomSecretKey();
const pub = ed.getPublicKey(priv);
const pubHex = bytesToHex(pub);

const message = JSON.stringify({
  pollId: POLL_ID,
  choice: CHOICE,
  ts: Date.now(),
});
const sig = await ed.signAsync(utf8ToBytes(message), priv);

const buf = new Uint8Array([
  ...pub,
  ...utf8ToBytes("|" + POLL_ID),
]);
const nullifier = bytesToHex(sha256(buf));

console.log(`voter ${pubHex.slice(0, 16)}… casting ${CHOICE}`);
console.log(`expected nullifier ${nullifier.slice(0, 16)}…`);

const res = await fetch(`${BASE}/api/polls/${POLL_ID}/vote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    choice: CHOICE,
    voterPubkey: pubHex,
    signature: bytesToHex(sig),
    message,
  }),
});
const data = await res.json();
console.log(`HTTP ${res.status}`, data);

if (res.ok) {
  // Sanity replay: same voter, same poll → must be rejected
  const replay = await fetch(`${BASE}/api/polls/${POLL_ID}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      choice: CHOICE,
      voterPubkey: pubHex,
      signature: bytesToHex(sig),
      message,
    }),
  });
  console.log(`replay HTTP ${replay.status}`, await replay.json());
}
