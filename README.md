# Galaxia — Universal Autonomous Intelligence & Assurance Tool

> **Built natively on SharedOS for the 2026 Autonomous Agent Economy.**  
> Sub-second latency (< 1.0s), deny-by-default bounded grant metering, and Ed25519 cryptographic receipts for verifiable agent-to-agent interactions.

---

## 1. Executive Summary & Problem Statement

In an open multi-agent economy, autonomous agents face three critical failure modes:
1. **The Freeloader Problem**: Unmetered bots exhaust LLM token budgets without paying or authorization.
2. **Hallucination & Unverifiable Consensus**: Calling agents receive unverified claims with zero cryptographic audit trail or proof of provenance.
3. **Execution Latency Spikes**: Multi-agent directed acyclic graphs (DAGs) fail when agents take 4–8 seconds to respond, triggering timeout cascading.

**Galaxia solves this by treating Permissions as the Payment Primitive.**

Galaxia is a deterministic, high-throughput intelligence gateway that exposes AST static security analysis, real-time web-grounded fact checking, structured schema extraction, and strategic planning. Every turn executed on Galaxia produces an **Ed25519-signed cryptographic docket** verifiable offline by any agent or human auditor.

---

## 2. Core Architectural Pillars

```
+-------------------------------------------------------------------------+
|                        SHAREDOS ARENA / NETWORK                         |
|   (MCP Clients | REST Consumers | SharedNet Bots | Human Operators)     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                    GALAXIA ADAPTIVE GATEWAY & SHIELD                    |
|   - Anti-Injection Prompt Shield                                        |
|   - Multi-Model Failover Ladder (GPT-OSS-120B / Qwen-27B / Compound)    |
|   - Output Sanitizer (Zero parser-breaking markdown/emojis)             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                 SHAREDOS EMBEDDED KERNEL & AUTHORIZER                   |
|   - Deny-by-Default Security Model                                      |
|   - Bounded Grant Metering (maxUses decrement per turn)                 |
|   - Capability Verification Matrix (actor / resource / action)          |
+------------------+----------------------------------+-------------------+
                   |                                  |
                   v                                  v
+------------------------------------+ +----------------------------------+
|      DUAL-LAYER INTELLIGENCE      | |    CRYPTOGRAPHIC PROVENANCE      |
|  1. Deterministic Static AST Engine| |  - Ed25519 Digital Signatures    |
|  2. Groq LPU Inference (< 1.0s)    | |  - Canonical JSON Hashing        |
|  3. Live Tavily Web Search Grounding| |  - Detached Receipt Attestation  |
+------------------------------------+ +----------------------------------+
```

### Pillar A: Bounded Grant Metering (Permissions = Payment)
Galaxia implements the official SharedOS `CapabilityAuthorizer`. Rather than relying on fragile payment confirmation chats:
- Paid capabilities (`galaxia.review`, `galaxia.verify`, `galaxia.format`, `galaxia.ask`) require explicit capability grants.
- Each grant enforces resource path boundaries, allowed actions, purpose strings, and remaining invocation limits (`maxUses`).
- When a grant budget reaches `0`, access is revoked deterministically before consuming costly model tokens.

### Pillar B: Dual-Layer Verification
- **Layer 1 (Deterministic Static AST)**: Analyzes code structure, syntax errors, dangerous SQL/eval calls, and complexity metrics in under 5ms.
- **Layer 2 (Groq LPU AI Inference)**: Executes deep semantic reasoning, OWASP vulnerability classification, grounded claim extraction, and refactored code fixes in ~400ms.

### Pillar C: Ed25519 Cryptographic Provenance
Every execution returns a detached digital signature over the canonical JSON receipt. Calling agents can independently verify that:
1. The result originated authentically from Galaxia's verified principal.
2. The parameters (timestamp, caller, purpose string, modelUsed) have not been tampered with in transit.

---

## 3. Capability Matrix & Pricing Tiers

| Capability ID | Mode | Cost | SLA | Description |
| :--- | :---: | :---: | :---: | :--- |
| `galaxia.lint` | `lint` | **0 Credits** | < 0.2s | **Free Tier**: Instant AST syntax sanity, type checks, and anti-pattern scans. |
| `galaxia.review` | `review` | **5 Credits** | < 0.8s | **Code Intelligence**: Logic bugs, OWASP/CVE security scan, refactored clean code fix, quality score /10. |
| `galaxia.verify` | `verify` | **3 Credits** | < 0.9s | **Grounded Fact-Check**: Real-time Tavily search queries, extracted citations, and fact rating. |
| `galaxia.format` | `format` | **5 Credits** | < 0.7s | **Schema Extraction**: Unstructured plain text transformed into validated, parseable JSON schema. |
| `galaxia.ask` | `ask` | **5 Credits** | < 0.8s | **Cognitive Strategist**: Technical problem analysis, executive summary, and numbered action plan. |

---

## 4. Integration Protocols

### A. Model Context Protocol (MCP)
Add Galaxia to your MCP client configuration (Cursor, Claude Desktop, AutoGen):

```json
{
  "mcpServers": {
    "galaxia": {
      "transport": "http",
      "url": "http://localhost:3000/api/mcp",
      "method": "POST"
    }
  }
}
```

### B. REST API Endpoint
Invoke Galaxia programmatically over HTTP:

```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "review",
    "caller": "agent:external-client",
    "input": "def authenticate(u, p): return db.query(f\"SELECT * FROM users WHERE u={u} AND p={p}\")"
  }'
```

### C. SharedNet Arena Room Protocol
In SharedNet rooms, Galaxia listens for autonomous mentions:

```text
@Galaxia lint: def sum(a, b): return a + b
@Galaxia review: query = f"SELECT * FROM accounts WHERE id={acc_id}"
@Galaxia verify: The James Webb Space Telescope is located at Sun-Earth L2.
@Galaxia format: Alex Vance is a Senior Architect in SF earning $210k.
@Galaxia ask: Design a low-latency rate-limiting policy for 50 autonomous agents.
```

---

## 5. Cryptographic Verification Specification

Galaxia provides an offline-verifiable signature schema using standard Ed25519 cryptography.

### Canonical Receipt Schema:
```json
{
  "receiptId": "att_sha256_7c91a3b8e210",
  "timestamp": "2026-09-13T01:45:00.000Z",
  "caller": "agent:buyer-node",
  "purposeString": "galaxia.review",
  "kernel": "SharedOS-Verified-0.1.0-alpha.5",
  "status": "COMPLETED"
}
```

### Verification Endpoints:
- `GET /api/pubkey` &rarr; Retrieves Galaxia's SPKI PEM public key.
- `POST /api/verify` &rarr; Verifies detached signatures against arbitrary receipt dockets.

---

## 6. Quickstart & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v20 & v22)
- Python 3.10+ (for arena listener)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/piyush28verma/codelens-arena.git
cd codelens-arena

# Install dependencies
npm install
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
TAVILY_API_KEY=tvly_your_tavily_key_here
MY_PRINCIPAL_ID=p_wXzmdHhSly
ROOM_ID=rom_TxTzqEUKyx
INVITE_TOKEN=rit_uAS3KksNuAyrdNC6u4niCTKeNQMXjp2IpPTZGVe4KUU
BASE_URL=https://www.sharednet.ai
```

### 3. Launching Services
```bash
# Option A: Run Full Stack (Backend + Vite React UI)
npm run dev

# Option B: Run Express Production Server
npm start

# Option C: Run SharedNet Room Listener Bot
python3 agent_bot.py
```

### 4. Running Test Suites
```bash
# End-to-End Architectural Test Suite (15 Test Cases)
npm run test:e2e

# Offline Standalone Verification Battery
python3 test_offline.py
```

---

## 7. Project Structure

```
codelens-arena/
├── server/
│   ├── index.mjs             # Express REST API, SSE Starlight Stream & Static Server
│   ├── kernel.mjs            # SharedOS CapabilityAuthorizer & Bounded Grant Matrix
│   ├── groq-engine.mjs       # Sub-second LPU Inference & Tavily Grounding Engine
│   ├── static-analyzer.mjs   # Deterministic AST Syntax & Security Analyzer
│   ├── crypto-signatures.mjs # Asymmetric Ed25519 Keypair & Signature Verifier
│   └── e2e-test.mjs          # Comprehensive 15-point End-to-End Test Suite
├── src/
│   ├── App.tsx               # React 18 + TypeScript + Lucide Dashboard Component
│   ├── main.tsx              # React Root Mount
│   └── index.css             # Theme Tokens & Starlight Glassmorphism Styles
├── public/
│   ├── index.html            # Standalone Production SPA
│   └── vendor/               # Offline-resilient React & Tailwind Vendor Bundles
├── agent_bot.py              # Autonomous SharedNet Arena Daemon
├── arena_tournament.py       # Automated Multi-Agent Tournament & Trading Daemon
├── agent.json                # Standard A2A Metadata & Capability Descriptor
├── vite.config.ts            # Vite Build & Proxy Configuration
└── package.json              # Project Scripts & Dependencies
```

---

## 8. License

Distributed under the MIT License. Built for the SharedOS 2026 Autonomous Agent Ecosystem.
