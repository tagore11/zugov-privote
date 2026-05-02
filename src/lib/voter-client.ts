"use client";

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

// @noble/ed25519 v3 needs an explicit sha512 binding (browser too).
ed.hashes.sha512 = sha512;

/**
 * Browser-side voter identity. Generates an ed25519 keypair on first use,
 * persists the private key to localStorage. Vote signatures use this key.
 *
 * Privote uses MACI keypairs; this is the same shape (pub/priv 32 bytes)
 * so the upgrade path is a key-format swap, not a flow change.
 */
const STORAGE_KEY = "zugov.privote.voter.v1";

export interface VoterIdentity {
  pubkeyHex: string;
  privkeyHex: string;
}

export function loadOrCreateVoter(): VoterIdentity {
  const existing =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as VoterIdentity;
      if (parsed.pubkeyHex && parsed.privkeyHex) return parsed;
    } catch {
      // fall through to recreate
    }
  }
  const priv = ed.utils.randomSecretKey();
  const pub = ed.getPublicKey(priv);
  const identity: VoterIdentity = {
    privkeyHex: bytesToHex(priv),
    pubkeyHex: bytesToHex(pub),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }
  return identity;
}

export function deriveNullifier(pubkeyHex: string, pollId: string): string {
  const buf = new Uint8Array([
    ...hexToBytes(pubkeyHex),
    ...utf8ToBytes("|" + pollId),
  ]);
  return bytesToHex(sha256(buf));
}

export async function signVote(args: {
  identity: VoterIdentity;
  pollId: string;
  choice: string;
}): Promise<{
  message: string;
  signature: string;
  nullifier: string;
}> {
  const message = JSON.stringify({
    pollId: args.pollId,
    choice: args.choice,
    ts: Date.now(),
  });
  const sig = await ed.signAsync(
    utf8ToBytes(message),
    hexToBytes(args.identity.privkeyHex)
  );
  return {
    message,
    signature: bytesToHex(sig),
    nullifier: deriveNullifier(args.identity.pubkeyHex, args.pollId),
  };
}

export function shortPub(pubkeyHex: string): string {
  return `${pubkeyHex.slice(0, 6)}…${pubkeyHex.slice(-4)}`;
}
