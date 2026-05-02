/**
 * Adversarial smoke: try to defeat signature/replay protection.
 */
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

ed.hashes.sha512 = sha512;

const POLL_ID = process.argv[2];
const BASE = "http://localhost:3000";

const priv = ed.utils.randomSecretKey();
const pub = ed.getPublicKey(priv);
const pubHex = bytesToHex(pub);

async function attempt(label, body) {
  const res = await fetch(`${BASE}/api/polls/${POLL_ID}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`${label} → HTTP ${res.status}`, data);
}

const message = JSON.stringify({ pollId: POLL_ID, choice: "yes", ts: Date.now() });
const sig = bytesToHex(await ed.signAsync(utf8ToBytes(message), priv));

// 1: bad signature
await attempt(
  "bad-signature",
  { choice: "yes", voterPubkey: pubHex, signature: "00".repeat(64), message }
);

// 2: signature for "yes" but body says "no"
await attempt(
  "swap-choice",
  { choice: "no", voterPubkey: pubHex, signature: sig, message }
);

// 3: message references different poll
const wrongMsg = JSON.stringify({ pollId: "0000", choice: "yes", ts: Date.now() });
const wrongSig = bytesToHex(await ed.signAsync(utf8ToBytes(wrongMsg), priv));
await attempt(
  "cross-poll-replay",
  { choice: "yes", voterPubkey: pubHex, signature: wrongSig, message: wrongMsg }
);

// 4: legitimate vote (should succeed)
await attempt("legit", {
  choice: "yes",
  voterPubkey: pubHex,
  signature: sig,
  message,
});

// 5: same voter twice (should be 409)
await attempt("double-vote", {
  choice: "yes",
  voterPubkey: pubHex,
  signature: sig,
  message,
});
