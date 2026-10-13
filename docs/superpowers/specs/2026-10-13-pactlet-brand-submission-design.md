# Pactlet brand and Turkish submission design

## Objective

Replace the temporary `beeple` name with `pactlet` across the repository and add a concise Turkish submission document for the Colosseum pitch and demo. Payment semantics, devnet-only limits, and the trusted-backend security claim remain unchanged.

## Rename scope

- Product copy, metadata, package name, merchant descriptions, docs, tests, and UI use `pactlet`.
- Server identifiers become `pactlet_session`, `PACTLET_DATABASE_PATH`, `pactletLedger`, and `pactlet*Store`.
- Agent exports become `buildPactletAgentGraph` and `runPactletManager`.
- Existing local cookies and the old database environment variable are intentionally not migrated; this is a pre-submission development rename.
- `AgentPass` remains only as a historical competitor reference and is never used as the project name.

## Turkish submission document

`docs/submission-tr.md` contains:

1. A founder-voice pitch script that fits under two minutes.
2. A timed product demo script that fits under three minutes.
3. An explicit three-sentence business and revenue model.
4. Team and traction lines that do not invent names or onchain evidence.
5. The two separate submission destinations and Türkiye deadline.

Claims must distinguish the verified x402 challenge and tested application from the still-pending real devnet settlement.

## Git delivery

The current MVP is split into coherent commits by architecture and milestone, followed by the Pactlet rename and Turkish submission material. The final tree must pass tests, typecheck, build, whitespace checks, and a case-insensitive scan for the former brand before pushing to `origin/main`.
