# Attest

Cryptographically signed audit trail for AI agent actions.

Attest is an open protocol and reference implementation for **Action Receipts** — signed, hash-chained records of what an AI agent did, why, whether it succeeded, and whether it can be undone.

## Why

AI agents act on behalf of humans — sending emails, modifying documents, executing commands. No open standard exists for recording these actions in a way that is tamper-evident, privacy-preserving, and machine-verifiable.

Attest fills this gap.

## How it works

Each action an agent takes produces a **receipt**: a W3C Verifiable Credential signed with Ed25519, containing:

- **What** happened (action type from a standardized taxonomy)
- **Who** authorized it (the human principal)
- **Which agent** performed it (the issuer)
- **Whether it succeeded** (outcome and reversibility)
- **Chain integrity** (hash link to the previous receipt)

Parameters are hashed, not stored in plaintext. The human principal controls what is disclosed.

## Status

**Draft specification, pre-prototype.** See [docs/action-receipt-spec-v0.1.md](docs/action-receipt-spec-v0.1.md) for the full spec.

## Roadmap

| Milestone | Description | Status |
|---|---|---|
| [M1: Receipt Core](https://github.com/ojongerius/attest/milestone/1) | Create, sign, chain, and verify receipts | In progress |
| [M2: Storage](https://github.com/ojongerius/attest/milestone/2) | SQLite persistence and querying | Planned |
| [M3: MCP Proxy Emitter](https://github.com/ojongerius/attest/milestone/3) | Intercept MCP tool calls, emit receipts | Planned |
| [M4: CLI](https://github.com/ojongerius/attest/milestone/4) | Verify, inspect, list, and export receipts | Planned |

## License

Apache 2.0 — see [LICENSE](LICENSE).
