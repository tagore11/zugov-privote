# ZuGov Privote

Anonymous voting on governance proposals with a local-first epistemic auditor.

Privote-mirror architecture (Coordinator / Poll / Voter / Tally) plus the **Grounding Engine**: an open-weights LLM that audits each proposal against six structured questions before voting opens.

## Why this exists

> "AI inside a governance system must be runnable by participants, not gated behind a closed API."
> Vitalik Buterin, *The promise and challenges of crypto + AI applications* (Jan 2024)

Most "AI-assisted governance" tools route proposals through a closed API (OpenAI, Anthropic). The community becomes a customer of that vendor, not a sovereign participant. ZuGov Privote inverts the default: the auditor runs on **open-weights models**, deterministically (`temperature=0`, fixed seed), so any community member can re-run the same proposal on their own machine and verify the report.

The Grounding Engine has **zero voting power and zero veto**. Its job is to surface what a proposal does not address. The decision belongs to the community.

## What it does

1. Coordinator creates a poll with a proposal text and a deadline.
2. The Grounding Engine produces a structured 6-question audit: assumptions, base rates, counterarguments, reversibility, affected parties, precedents.
3. Voters cast ed25519-signed votes. Each (voter, poll) gets a unique nullifier so double-voting is rejected at the DB level.
4. The tally stays sealed until the deadline (or a coordinator force-close).

## Architecture

| Privote / MACI concept | This MVP                                | Production upgrade            |
|------------------------|------------------------------------------|-------------------------------|
| MACI keypair           | ed25519 keypair in browser localStorage  | babyJubJub MACI keypair       |
| Poseidon nullifier     | sha256(pubkey ‖ pollId)                  | Poseidon-in-circuit           |
| Coordinator            | poll creator's pubkey                    | role with zk-decryption rights |
| Encrypted vote message | plaintext + signature                    | El-Gamal + ZK proof           |
| Tally                  | server-side count after deadline         | Groth16 tally circuit         |

The MVP is a **MACI-ready stub**: the data flow, role split, and nullifier semantics already match. The zk and encryption layers are the next iteration, not a redesign.

## Position in the ZuGov full stack

This repo is **Layer 0** (epistemic audit) of a six-layer governance protocol. The other layers are being built by parallel teams.

| Layer | What                                                  | Where                                          |
|-------|-------------------------------------------------------|------------------------------------------------|
| 0     | Grounding Engine (this repo)                          | tagore11/zugov-privote                         |
| 1     | Identity (Anon-Aadhaar / Semaphore / Zupass / EAS)    | znurznurznur/maci#frontend                     |
| 2     | MACI ranked voting (circuits)                         | znurznurznur/maci#main                         |
| 3     | Coordinator + ZK tally proofs                         | znurznurznur/maci#main                         |
| 4     | Subgraph indexing + frontend dashboard                | znurznurznur/maci#frontend (also Emre's draft) |
| 5     | Gamification (epistemic karma, plurality score)       | deferred                                       |

The Layer 1-3 work is led by Dr. Öznur Kalkar (TÜBİTAK BİLGEM UEKAE), forking privacy-ethereum/maci with ranked voting circuits. The integration path is an adapter interface in `src/lib/crypto-server.ts` and `src/lib/voter-client.ts`: the ed25519 stub gets swapped for `@maci-protocol/sdk` once their fork stabilises. Targeted swap window: July-August 2026, ahead of ZuKaş 2026 (Sept 9-20).

## Stack

- Next.js 16 (App Router) + Turbopack, TypeScript, Tailwind 4
- Postgres (Neon in prod, better-sqlite3 in local dev)
- @noble/ed25519 + @noble/hashes for sign/verify and nullifier derivation
- Any OpenAI-compatible LLM endpoint for the Grounding Engine: Ollama, vLLM, OpenRouter, llama.cpp

## Verify locally (the Vitalik test)

You should not have to trust the deployed instance. Run the same proposal on your own machine and compare:

```bash
brew install ollama
ollama serve &
ollama pull qwen2.5:7b

git clone https://github.com/<owner>/zugov-privote.git
cd zugov-privote
npm install
LOCAL_LLM_BASE_URL=http://localhost:11434/v1 npm run dev
```

The Grounding Engine on your machine and the deployed one both run open-weights models with `temperature=0, seed=42`. If the reports diverge, that is the signal: different model, different perspective, both legitimate. Convergence across models is high epistemic weight.

## Roadmap

| Phase | What                                                                         | Status |
|-------|-------------------------------------------------------------------------------|--------|
| 1     | Local Grounding Engine, single open-weights model                             | done   |
| 2     | Multi-model ensemble (qwen + llama + mistral), agreement matrix               | next   |
| 3     | Adversarial triad (advocate / critic / judge)                                 | next   |
| 4     | zkML inference proof (EZKL / Risc Zero)                                       | future |

## License

MIT.
