# Attest — Action Receipt Protocol — Draft Specification v0.1

> **Status:** Draft — working document for prototype development
> **Author:** Otto
> **Date:** 29 March 2026
> **License:** Apache 2.0

---

## 1. Problem Statement

AI agents are increasingly acting on behalf of humans — sending emails, modifying documents, making purchases, booking travel, managing files. No open standard exists for recording what an agent did, why it did it, whether it succeeded, and whether it can be undone.

The current state:
- 93% of open-source AI agent projects use unscoped API keys with no audit trail (Grantex, March 2026)
- Only 13% include any form of action logging, and where it exists, it's opt-in and not tied to authorization
- No project produces an audit trail linking a specific action to a specific agent, user authorization, and set of scopes
- Anthropic's own enterprise audit logs don't capture Claude in Excel or Cowork activity
- The EU AI Act mandates traceability for high-risk AI systems, but no standard format exists for agent action records

### What exists and what doesn't

| Layer | Existing standards | Gap |
|---|---|---|
| Agent identity | W3C DIDs, AgentStamp, MolTrust, Grantex | No adoption by major platforms |
| Action authorization | OAuth 2.0, Grantex (IETF draft) | No cross-platform standard for agent-specific scopes |
| Content provenance | C2PA Content Credentials | Designed for media assets, not agent actions |
| Action logging | Vendor-specific (LangSmith, Arize) | No standard format — everyone rolls their own |
| **Action receipts** | **Nothing** | **This specification** |

---

## 2. Design Principles

1. **Privacy-preserving by default.** Parameters are hashed, not stored in plaintext. The human principal controls what is disclosed. Sensitive data never appears in receipts — only hashes and user-controlled previews.

2. **Built on existing standards.** W3C Verifiable Credentials Data Model 2.0 for structure. Ed25519 for signing. SHA-256 for hashing. RFC 3161 for trusted timestamps. No novel cryptographic primitives.

3. **Hash-chained for integrity.** Each receipt includes the hash of the previous receipt, forming a tamper-evident chain (borrowing from C2PA's approach). Breaking the chain is detectable.

4. **Agent-agnostic.** The spec does not assume MCP, OpenAI function calling, or any specific agent framework. Any agent that can produce JSON and sign it can emit receipts.

5. **Human-readable and machine-verifiable.** Receipts can be displayed as a timeline to end users and cryptographically verified by auditors and compliance tools.

6. **Reversibility-aware.** Every receipt declares whether the action can be undone, and if so, how. This enables downstream tooling to offer "undo" capabilities.

7. **Minimal by default, extensible by design.** The core schema is small. Domain-specific extensions (financial actions, healthcare, etc.) can be layered on via additional `@context` URIs.

---

## 3. Core Concepts

### 3.1 Action Receipt

A cryptographically signed record of a single action taken by an AI agent on behalf of a human principal. Modeled as a W3C Verifiable Credential with type `AIActionReceipt`.

### 3.2 Receipt Chain

An ordered sequence of Action Receipts linked by hash references. Each receipt contains the hash of the previous receipt in the chain, creating a tamper-evident log. The first receipt in a chain has a `null` previous hash.

### 3.3 Action Taxonomy

A standardized vocabulary of action types, organized by domain and risk level. The taxonomy enables cross-agent comparison and risk classification.

### 3.4 Principal

The human (or organization) on whose behalf the agent acted. Identified by a DID or other stable identifier. The principal is the entity who authorized the action, not the entity that built or operates the agent.

### 3.5 Issuer

The agent (or agent platform) that performed the action and produced the receipt. The issuer signs the receipt with its private key.

---

## 4. Schema

### 4.1 Action Receipt (full schema)

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://attest.sh/v1"
  ],
  "id": "urn:receipt:550e8400-e29b-41d4-a716-446655440000",
  "type": ["VerifiableCredential", "AIActionReceipt"],
  "version": "0.1.0",

  "issuer": {
    "id": "did:agent:claude-cowork-instance-abc123",
    "type": "AIAgent",
    "name": "Claude Cowork",
    "operator": {
      "id": "did:org:anthropic",
      "name": "Anthropic"
    },
    "model": "claude-sonnet-4.6",
    "session_id": "session_xyz789"
  },

  "issuanceDate": "2026-03-29T14:30:00Z",

  "credentialSubject": {
    "principal": {
      "id": "did:user:otto-abc",
      "type": "HumanPrincipal"
    },

    "action": {
      "id": "act_001",
      "type": "communication.email.send",
      "risk_level": "high",
      "target": {
        "system": "mail.google.com",
        "resource": "email:compose"
      },
      "parameters_hash": "sha256:a3f1c2d4e5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
      "timestamp": "2026-03-29T14:30:00Z",
      "trusted_timestamp": null
    },

    "intent": {
      "conversation_hash": "sha256:b4e2d1f3a5c6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
      "prompt_preview": "Send the Q3 report to the team",
      "prompt_preview_truncated": true,
      "reasoning_hash": "sha256:c5f3e2d4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"
    },

    "outcome": {
      "status": "success",
      "error": null,
      "reversible": true,
      "reversal_method": "gmail:undo_send",
      "reversal_window_seconds": 30,
      "state_change": {
        "before_hash": "sha256:d6g4f3e5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
        "after_hash": "sha256:e7h5g4f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4"
      }
    },

    "authorization": {
      "scopes": ["email:send", "drive:read"],
      "granted_at": "2026-03-29T14:00:00Z",
      "expires_at": "2026-03-29T15:00:00Z",
      "grant_ref": null
    },

    "chain": {
      "sequence": 1,
      "previous_receipt_hash": null,
      "chain_id": "chain_session_xyz789"
    }
  },

  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-03-29T14:30:01Z",
    "verificationMethod": "did:agent:claude-cowork-instance-abc123#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z..."
  }
}
```

### 4.2 Minimal Receipt (required fields only)

For lightweight or high-frequency actions, a minimal receipt containing only required fields:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://attest.sh/v1"
  ],
  "id": "urn:receipt:660e8400-e29b-41d4-a716-446655440001",
  "type": ["VerifiableCredential", "AIActionReceipt"],
  "version": "0.1.0",
  "issuer": { "id": "did:agent:claude-cowork-instance-abc123" },
  "issuanceDate": "2026-03-29T14:31:00Z",
  "credentialSubject": {
    "principal": { "id": "did:user:otto-abc" },
    "action": {
      "id": "act_002",
      "type": "filesystem.file.read",
      "risk_level": "low",
      "timestamp": "2026-03-29T14:31:00Z"
    },
    "outcome": { "status": "success" },
    "chain": {
      "sequence": 2,
      "previous_receipt_hash": "sha256:f8i6h5g7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
      "chain_id": "chain_session_xyz789"
    }
  },
  "proof": { "type": "Ed25519Signature2020", "proofValue": "z..." }
}
```

---

## 5. Action Taxonomy (Draft)

Hierarchical action types, organized by domain. Risk levels are defaults — implementations may override based on context.

The Phase 1 prototype implements **filesystem**, **system**, and **unknown** action types only. Additional domains (communication, documents, financial, data) will be added as real usage demands them — see Appendix A for the planned taxonomy.

### 5.1 Filesystem

| Action type | Description | Default risk |
|---|---|---|
| `filesystem.file.create` | Create a file | low |
| `filesystem.file.read` | Read a file | low |
| `filesystem.file.modify` | Modify a file | medium |
| `filesystem.file.delete` | Delete a file | high |
| `filesystem.file.move` | Move or rename a file | medium |
| `filesystem.directory.create` | Create a directory | low |
| `filesystem.directory.delete` | Delete a directory | high |

### 5.2 System

| Action type | Description | Default risk |
|---|---|---|
| `system.application.launch` | Launch an application | low |
| `system.application.control` | Control an application via UI automation | medium |
| `system.settings.modify` | Modify system or app settings | high |
| `system.command.execute` | Execute a shell command | high |
| `system.browser.navigate` | Navigate to a URL | low |
| `system.browser.form_submit` | Submit a web form | medium |
| `system.browser.authenticate` | Log into a service | high |

### 5.3 Unknown

| Action type | Description | Default risk |
|---|---|---|
| `unknown` | Tool call that does not map to any known action type | medium |

Any MCP tool call that cannot be classified via the taxonomy mapping config falls back to `unknown` with a default risk level of `medium`. The original tool name is preserved in the receipt's `action.target` field for later classification.

---

## 6. Risk Levels

Four levels, used for filtering and alerting:

| Level | Description | Examples |
|---|---|---|
| `low` | Read-only or easily reversible | Read a file, navigate to URL, create a draft |
| `medium` | Modifies state but reversible or low-impact | Edit a document, move a file, modify settings |
| `high` | Significant state change, may be hard to reverse | Send an email, delete a file, share a document |
| `critical` | Financial commitment or irreversible action | Make a purchase, authorize a payment, delete an account |

---

## 7. Receipt Chain Verification

### 7.1 Chain integrity

To verify a receipt chain:

1. For each receipt in sequence order:
   a. Verify the `proof` signature against the issuer's public key
   b. Compute `SHA-256(canonical(receipt))` — the hash of the receipt's canonical JSON representation
   c. Confirm that the next receipt's `chain.previous_receipt_hash` matches this hash
   d. Confirm `chain.sequence` is strictly incrementing

2. If any step fails, the chain is broken at that point. Receipts before the break are valid; receipts after are suspect.

### 7.2 Canonical form

For hashing, receipts are serialized using JSON Canonicalization Scheme (RFC 8785) with the `proof` field removed before hashing (same pattern as W3C VC Data Integrity).

---

## 8. Prototype Architecture

### 8.1 Components

```
┌─────────────────────────────────────────────────┐
│                  Human / Consumer                │
│                                                  │
│  ┌──────────────┐     ┌───────────────────────┐  │
│  │ Receipt       │     │ CLI Verifier          │  │
│  │ Viewer (Web)  │     │ (verify chain, export)│  │
│  └──────┬───────┘     └──────────┬────────────┘  │
│         │                        │               │
│         └──────────┬─────────────┘               │
│                    │                             │
│              Receipt Store                       │
│           (SQLite / JSON files)                  │
│                    │                             │
└────────────────────┼─────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────┐
│              Receipt Emitters                     │
│                    │                             │
│  ┌─────────────────┴──────────────────────────┐  │
│  │  MCP Proxy (reference implementation)       │  │
│  │  - Wraps STDIO MCP servers                  │  │
│  │  - Intercepts JSON-RPC tool calls           │  │
│  │  - Emits Action Receipt for each tool call  │  │
│  │  - Classifies risk using action taxonomy    │  │
│  │  - Maintains hash chain per session         │  │
│  │  - Signs receipts with Ed25519 key          │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  Future emitters:                                 │
│  - Native agent integration (Claude, ChatGPT)    │
│  - macOS daemon (observes screen control,         │
│    emits receipts from external observation)      │
│  - Browser extension (observes web actions)       │
│                                                   │
└───────────────────────────────────────────────────┘
```

### 8.2 MCP Proxy Emitter (reference implementation)

This extends the existing `beacon-proxy` prototype:

**Input:** STDIO transport between MCP client (Claude Desktop) and MCP server
**Interception:** JSON-RPC `tools/call` requests and responses
**Output:** Action Receipt (signed, hash-chained) for each tool call

Mapping from MCP tool calls to Action Receipts:

| MCP field | Receipt field |
|---|---|
| `method: "tools/call"` | Triggers receipt creation |
| `params.name` | `action.type` (mapped via taxonomy config) |
| `params.arguments` | Hashed → `action.parameters_hash` |
| `result` | `outcome.status`, `outcome.state_change` |
| Server identity | `action.target.system` |
| Proxy session | `chain.chain_id` |
| Sequence counter | `chain.sequence` |

### 8.3 Receipt Store

SQLite database (local-first, no cloud dependency):

```sql
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,                    -- urn:receipt:uuid
  chain_id TEXT NOT NULL,                 -- groups receipts by session
  sequence INTEGER NOT NULL,             
  action_type TEXT NOT NULL,              -- from taxonomy
  risk_level TEXT NOT NULL,               -- low/medium/high/critical
  status TEXT NOT NULL,                   -- success/failure/pending
  timestamp TEXT NOT NULL,                -- ISO 8601
  issuer_id TEXT NOT NULL,                -- agent DID
  principal_id TEXT,                      -- human DID
  receipt_json TEXT NOT NULL,             -- full signed receipt
  receipt_hash TEXT NOT NULL,             -- SHA-256 of canonical form
  previous_receipt_hash TEXT,             -- chain link
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_chain ON receipts(chain_id, sequence);
CREATE INDEX idx_receipts_action ON receipts(action_type);
CREATE INDEX idx_receipts_risk ON receipts(risk_level);
CREATE INDEX idx_receipts_timestamp ON receipts(timestamp);
```

### 8.4 Receipt Viewer

Web application (can be a simple React app or static HTML):

- **Timeline view:** Chronological list of receipts, color-coded by risk level
- **Chain verification:** Visual indicator of chain integrity (green = intact, red = broken)
- **Filtering:** By action type, risk level, agent, time range
- **Detail view:** Full receipt JSON with signature verification status
- **Export:** JSON, CSV, or compliance-ready PDF report

---

## 9. Implementation Roadmap

### Phase 1: Spec + Reference Emitter (Weeks 1-4)

- [ ] Finalize this spec document (iterate based on prototype learnings)
- [ ] Implement Ed25519 key generation and signing
- [ ] Implement receipt creation from MCP tool call interception
- [ ] Implement hash-chaining (SHA-256, RFC 8785 canonicalization)
- [ ] Implement SQLite receipt store
- [ ] Implement action taxonomy mapping (config file: MCP tool name → action type)
- [ ] Wire into existing beacon-proxy STDIO interceptor
- [ ] Write tests: receipt creation, chain verification, tamper detection

### Phase 2: Viewer + Verifier (Weeks 4-7)

- [ ] Build CLI verifier: `attest verify <chain_id>` — validates chain integrity
- [ ] Build CLI inspector: `attest inspect <receipt_id>` — shows receipt details
- [ ] Build web viewer: timeline, filtering, chain status
- [ ] Build chain export: JSON bundle of all receipts in a chain

### Phase 3: Documentation + Community (Weeks 7-10)

- [ ] Write spec as a proper standalone document (not just this working doc)
- [ ] Create GitHub org and repo structure
- [ ] Write "Why Action Receipts?" explainer (the Grantex playbook — publish the problem, then the solution)
- [ ] Publish npm package for MCP proxy emitter
- [ ] Submit to MCP Enterprise Working Group (or equivalent)
- [ ] DEV.to / blog posts

### Phase 4: Adoption + Product (Months 3-6)

- [ ] Build macOS daemon emitter (Option A hybrid — observes screen control, emits receipts)
- [ ] Explore native integration conversations (Anthropic, OpenAI)
- [ ] Build hosted viewer as freemium SaaS (the commercial product)
- [ ] Compliance export features (EU AI Act alignment)

---

## 10. Design Decisions

### Resolved for Phase 1

1. **W3C VC envelope:** Yes — conform to the VC Data Model 2.0 JSON shape, but no VC library dependency. Receipts are shaped as VCs but created with plain JSON serialization. Revisit if the envelope proves too heavyweight (target: minimal receipt <1KB).

2. **Signing:** Ed25519 via Node.js built-in `crypto` module. Single proof type for now. Multi-proof-type support (e.g., X.509 for C2PA alignment) deferred.

3. **Trusted timestamps:** Skipped for prototype. Local timestamps only. RFC 3161 TSA support deferred to compliance-grade phase.

4. **Chain scope:** Per-session chains. One chain per MCP proxy session. Revisit for long-running agents.

5. **Taxonomy scope:** Filesystem and system action types only, plus `unknown` fallback. Additional domains added as real usage demands.

6. **Storage:** Local SQLite. The spec is storage-agnostic; SQLite is the prototype implementation.

7. **Language:** TypeScript. Natural fit for MCP ecosystem (MCP SDK is TypeScript), native JSON handling, Ed25519 via Node crypto.

8. **Receipts as separate log:** Receipts are stored in a separate log, not attached to outputs. Simpler, sufficient for audit. Attachment (C2PA-style) deferred.

9. **Revocation:** Issue a new "reversal" receipt rather than mutating the original. Consistent with the append-only chain model.

### Open — to validate during prototyping

1. **Privacy granularity:** How much control does the principal have over what appears in receipts? Action types reveal what was done even without parameters. Acceptable for audit, but needs user consent model.

2. **Multi-agent chains:** When Agent A delegates to Agent B, how are receipt chains linked? Need a `delegation` field linking child chains to parent chains. Deferred until multi-agent scenarios are in scope.

---

## 11. Relationship to Existing Work

| Project | Relationship |
|---|---|
| **C2PA / Content Credentials** | Inspiration for the approach (signed provenance manifests). Attest extends the concept from media assets to agent actions. Could potentially be formalized as a C2PA extension. |
| **W3C Verifiable Credentials** | Attest receipts are VCs. We use the VC Data Model 2.0 as the envelope format. |
| **Grantex** | Complementary. Grantex handles authorization (should this agent be allowed?). Attest handles receipts (what did this agent do?). An Action Receipt could reference a Grantex grant token. |
| **AgentStamp** | Overlapping in audit trail and agent identity. AgentStamp's hash-chained audit is similar but narrower (trust verification events only, MCP-only). |
| **MolTrust** | Complementary. Agent registry and reputation. Could be the identity layer that issues the agent DIDs referenced in receipts. |
| **MCP Protocol** | The reference implementation is an MCP proxy. The spec itself is MCP-agnostic but MCP is the first integration target. |
| **beacon-proxy (your prototype)** | The reference implementation extends this directly. STDIO interception, JSON-RPC parsing, SQLite logging, risk classification — all carry forward. |

---

## 12. Open Questions

1. ~~**Name:**~~ **Resolved.** The project is called **Attest**.

2. ~~**Should receipts be attached to the output?**~~ **Resolved.** Separate log for Phase 1. Attachment deferred.

3. **Multi-agent chains:** When Agent A delegates to Agent B, how are the receipt chains linked? The `issuer` changes but the `principal` stays the same. Need a `delegation` field linking child chains to parent chains. Deferred until multi-agent scenarios are in scope.

4. **Offline/batched receipts:** If the agent can't sign in real-time (e.g., high-frequency actions), can receipts be batched and signed? This weakens the chain integrity guarantee but may be necessary for performance. Deferred — MCP tool call frequency doesn't require this yet.

5. ~~**Revocation:**~~ **Resolved.** Issue a new "reversal" receipt. The chain is append-only.

---

## Appendix A: Future Action Taxonomy Domains

The following domains are planned for future phases. Included here for reference; not implemented in Phase 1.

### Communication

| Action type | Description | Default risk |
|---|---|---|
| `communication.email.send` | Send an email | high |
| `communication.email.draft` | Create a draft email | medium |
| `communication.email.read` | Read email content | medium |
| `communication.email.delete` | Delete an email | high |
| `communication.message.send` | Send a chat message (Slack, Teams, etc.) | high |
| `communication.calendar.create` | Create a calendar event | medium |
| `communication.calendar.modify` | Modify a calendar event | medium |
| `communication.calendar.delete` | Delete a calendar event | high |

### Documents

| Action type | Description | Default risk |
|---|---|---|
| `document.create` | Create a new document | low |
| `document.modify` | Modify document content | medium |
| `document.delete` | Delete a document | high |
| `document.share` | Share a document with others | high |
| `document.spreadsheet.modify_cell` | Modify spreadsheet cell values | medium |
| `document.spreadsheet.modify_formula` | Modify spreadsheet formulas | high |
| `document.spreadsheet.modify_structure` | Add/remove sheets, rows, columns | medium |
| `document.presentation.modify_slide` | Modify presentation slide content | medium |

### Financial

| Action type | Description | Default risk |
|---|---|---|
| `financial.payment.initiate` | Initiate a payment or purchase | critical |
| `financial.payment.authorize` | Authorize a pending payment | critical |
| `financial.subscription.create` | Create a subscription | critical |
| `financial.subscription.cancel` | Cancel a subscription | high |
| `financial.booking.create` | Book travel, accommodation, etc. | high |
| `financial.booking.cancel` | Cancel a booking | high |

### Data

| Action type | Description | Default risk |
|---|---|---|
| `data.api.read` | Read data from an external API | low |
| `data.api.write` | Write data to an external API | medium |
| `data.api.delete` | Delete data via an external API | high |
| `data.database.query` | Query a database | low |
| `data.database.modify` | Modify database records | high |
