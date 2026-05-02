import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

// @noble/ed25519 v3 requires the host to wire in a sha512 implementation.
ed.hashes.sha512 = sha512;

/**
 * Verify an ed25519 signature.
 * MACI-ready stub: when MACI lands, this gets replaced by zk-proof verification.
 */
export async function verifyVoteSignature(args: {
  message: string;
  signatureHex: string;
  pubkeyHex: string;
}): Promise<boolean> {
  try {
    const ok = await ed.verifyAsync(
      hexToBytes(args.signatureHex),
      utf8ToBytes(args.message),
      hexToBytes(args.pubkeyHex)
    );
    return ok;
  } catch {
    return false;
  }
}

/**
 * Nullifier = sha256(pubkey || pollId). One vote per (voter, poll).
 * Privote/MACI use Poseidon over a circuit; sha256 here is a placeholder
 * with the same semantic guarantee.
 */
export function deriveNullifier(pubkeyHex: string, pollId: string): string {
  const buf = new Uint8Array([
    ...hexToBytes(pubkeyHex),
    ...utf8ToBytes("|" + pollId),
  ]);
  return bytesToHex(sha256(buf));
}
