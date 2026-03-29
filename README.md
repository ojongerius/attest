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

## Phase 1 scope

- TypeScript reference implementation
- MCP proxy emitter (intercepts tool calls, emits receipts)
- Ed25519 signing via Node.js crypto
- SHA-256 hash-chained receipts (RFC 8785 canonicalization)
- SQLite local receipt store
- Filesystem and system action types (+ unknown fallback)

## License

Apache 2.0 — see [LICENSE](LICENSE).
