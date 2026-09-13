import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { executeGalaxiaTurn, PURPOSE_STRINGS, getGrantMatrix } from "./kernel.mjs";
import { getPublicKey, verifySignature } from "./crypto-signatures.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PRINCIPAL_ID = process.env.MY_PRINCIPAL_ID || "p_wXzmdHhSly";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

import fs from "fs";

// Serve static frontend files from dist/ (if built) or public/
const distDir = path.join(__dirname, "..", "dist");
const publicDir = path.join(__dirname, "..", "public");
const staticDir = (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, "index.html"))) ? distDir : publicDir;
app.use(express.static(staticDir));

// In-memory activity history for inspections & live feed
const activityHistory = [];
const sseClients = new Set();

const stats = {
  totalExecutions: 0,
  totalLatencyMs: 0,
  startedAt: Date.now(),
  byMode: { lint: 0, review: 0, verify: 0, format: 0, ask: 0 }
};

// ==============================================================================
// 1. CRYPTOGRAPHIC PUBLIC KEY & VERIFICATION ENDPOINTS (Ed25519)
// ==============================================================================

app.get("/api/pubkey", (req, res) => {
  const pubkey = getPublicKey();
  res.json({
    algorithm: "Ed25519",
    format: "SPKI_PEM",
    publicKey: pubkey,
    instructions: "Verify any Galaxia receipt offline using standard Ed25519 verification over the canonical JSON of the receipt object."
  });
});

app.post("/api/verify", (req, res) => {
  const { docket, receipt, signature, publicKey } = req.body || {};
  const targetDocket = docket || receipt;

  if (!targetDocket) {
    return res.status(400).json({ valid: false, verified: false, message: "Missing 'docket' or 'receipt' payload in request body." });
  }

  const sigToVerify = signature || targetDocket.signature;
  if (!sigToVerify) {
    return res.status(400).json({ valid: false, verified: false, message: "Missing 'signature' field." });
  }

  const cleanDocket = { ...targetDocket };
  delete cleanDocket.signature;
  delete cleanDocket.signatureAlgorithm;

  const verification = verifySignature(cleanDocket, sigToVerify, publicKey);
  const isValid = verification.valid === true;

  res.json({
    ...verification,
    valid: isValid,
    verified: isValid,
    receiptId: targetDocket.receiptId || targetDocket.receipt_id,
    purposeString: targetDocket.purposeString || targetDocket.purpose,
    kernel: "SharedOS-Verified-0.1.0-alpha.5",
    message: isValid ? "Receipt is authentic, verified by SharedOS Kernel with Ed25519." : "Signature verification failed."
  });
});

// ==============================================================================
// 2. DISCOVERY & METADATA ENDPOINTS
// ==============================================================================

app.get("/.well-known/agent.json", (req, res) => {
  res.json({
    name: "Galaxia",
    handle: "@Galaxia",
    version: "2.0.0",
    description: "Universal Autonomous Intelligence & Assurance Tool on SharedOS: Code Intelligence, Grounded Fact-Checking, Schema Extraction & Strategic Reasoning.",
    principalId: PRINCIPAL_ID,
    sla: "< 1.0s (Groq LPU Inference)",
    publicKeyUrl: "/api/pubkey",
    purposeStrings: Object.values(PURPOSE_STRINGS),
    features: [
      "Prompt-Guard & Anti-Injection Shield",
      "Dual-Pipeline (Deterministic Static + LLaMA-3.3 70B AI) Scoring",
      "Bounded Grant Metering (maxUses = credits)",
      "Ed25519 Asymmetric Cryptographic Signing",
      "Live Tavily Web Search Grounding"
    ],
    pricing: {
      currency: "Arena Credits",
      tiers: [
        { name: "Free Lint (Free Tier)", mode: "lint", price: 0, description: "Instant syntax sanity & anti-pattern check" },
        { name: "Code Review & Security", mode: "review", price: 5, description: "Logic bugs, OWASP/CVE security scan, refactored clean code, quality score /10" },
        { name: "Claim Verification & Fact-Check", mode: "verify", price: 3, description: "Grounded live claim verification with evidence citations & truth rating" },
        { name: "Schema & Data Extraction", mode: "format", price: 5, description: "Raw text to clean, validated structured JSON schema" },
        { name: "Cognitive Strategist & Tasks", mode: "ask", price: 5, description: "Deep technical analysis, executive summary & step-by-step resolution plan" }
      ]
    },
    interfaces: {
      mcp: "/api/mcp",
      rest: "/api/v1/execute",
      audit: "/api/v1/audit",
      verify: "/api/verify",
      pubkey: "/api/pubkey",
      listing: "/api/v1/listing",
      grants: "/api/v1/grants"
    }
  });
});

app.get("/api/v1/listing", (req, res) => {
  res.json({
    services: [
      { id: "galaxia_lint", name: "Free Lint (Free Tier)", price: 0, currency: "Arena Credits", purposeString: PURPOSE_STRINGS.lint },
      { id: "galaxia_review", name: "Code Review & Security Audit", price: 5, currency: "Arena Credits", purposeString: PURPOSE_STRINGS.review },
      { id: "galaxia_verify", name: "Claim Verification & Fact-Check", price: 3, currency: "Arena Credits", purposeString: PURPOSE_STRINGS.verify },
      { id: "galaxia_format", name: "Schema & Data Extraction", price: 5, currency: "Arena Credits", purposeString: PURPOSE_STRINGS.format },
      { id: "galaxia_ask", name: "Cognitive Strategist & Deep Tasks", price: 5, currency: "Arena Credits", purposeString: PURPOSE_STRINGS.ask }
    ]
  });
});

app.get("/api/v1/health", (req, res) => {
  const avgLatency = stats.totalExecutions > 0
    ? Math.round(stats.totalLatencyMs / stats.totalExecutions)
    : 0;

  res.json({
    status: "ok",
    agent: "Galaxia-Agent",
    kernel: "@aicoo/sharedos-0.1.0-alpha.5",
    uptimeSeconds: Math.floor((Date.now() - stats.startedAt) / 1000),
    totalExecutions: stats.totalExecutions,
    averageLatencyMs: avgLatency,
    executionsByMode: stats.byMode,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/v1/grants", (req, res) => {
  const rawGrants = getGrantMatrix();
  const formattedGrants = rawGrants.map(g => ({
    id: g.id,
    capability_id: g.id,
    actor: g.actor,
    resource: g.path,
    resource_path: g.path,
    action: g.action,
    purpose: g.purposeString,
    purpose_string: g.purposeString,
    max_uses: g.maxUses,
    remaining_uses: g.remainingUses,
    status: g.status
  }));

  res.json({
    kernel: "SharedOS Embedded Kernel",
    version: "@aicoo/sharedos-0.1.0-alpha.5",
    securityModel: "Deny-By-Default + Bounded Grant Metering",
    namespace: "galaxia",
    owner: "owner.galaxia",
    grants: formattedGrants,
    items: formattedGrants,
    data: formattedGrants,
    purposeStrings: PURPOSE_STRINGS
  });
});

// ==============================================================================
// 3. ACTIVITY HISTORY & LIVE FEED (SSE) ENDPOINTS
// ==============================================================================

app.get("/api/v1/audits", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const items = activityHistory.slice(0, limit);
  res.json({
    audits: items,
    activities: items,
    items,
    data: items,
    total: stats.totalExecutions,
    averageLatencyMs: stats.totalExecutions > 0
      ? Math.round(stats.totalLatencyMs / stats.totalExecutions)
      : 0
  });
});

app.get("/api/v1/audits/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

function broadcastActivityEvent(entry) {
  const payload = `data: ${JSON.stringify({ type: "activity", ...entry })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ==============================================================================
// 4. CORE EXECUTION REST API
// ==============================================================================

const handleExecution = async (req, res) => {
  try {
    const { input, code, query, text, mode = "review", caller = "agent:arena-caller" } = req.body || {};
    const payload = input || code || query || text;

    if (!payload) {
      return res.status(400).json({ error: "Missing required 'input', 'code', 'query', or 'text' field." });
    }

    const turnResult = await executeGalaxiaTurn({ caller, input: payload, mode });

    const activityEntry = {
      timestamp: new Date().toISOString(),
      caller,
      actor: caller,
      mode: turnResult.mode,
      latency: turnResult.latencyMs,
      latency_ms: turnResult.latencyMs,
      latencyMs: turnResult.latencyMs,
      modelUsed: turnResult.modelUsed,
      receiptId: turnResult.receipt.receiptId,
      receipt_id: turnResult.receipt.receiptId,
      purposeString: turnResult.purposeString,
      priceCredits: turnResult.priceCredits,
      score: turnResult.scoring?.deterministicScore ?? 100,
      deterministic_score: turnResult.scoring?.deterministicScore ?? 100,
      promptShield: turnResult.promptShield?.riskLevel,
      status: "VERIFIED",
      verified: true,
      preview: payload.slice(0, 80) + (payload.length > 80 ? "..." : "")
    };

    activityHistory.unshift(activityEntry);
    if (activityHistory.length > 100) activityHistory.pop();

    stats.totalExecutions++;
    stats.totalLatencyMs += turnResult.latencyMs;
    stats.byMode[turnResult.mode] = (stats.byMode[turnResult.mode] || 0) + 1;

    broadcastActivityEvent(activityEntry);

    res.json({
      ok: true,
      output: turnResult.report,
      result: turnResult.report,
      response: turnResult.report,
      report: turnResult.report,
      score: turnResult.scoring?.deterministicScore ?? 100,
      deterministic_score: turnResult.scoring?.deterministicScore ?? 100,
      deterministicScore: turnResult.scoring?.deterministicScore ?? 100,
      priceCredits: turnResult.priceCredits,
      mode: turnResult.mode,
      latencyMs: turnResult.latencyMs,
      latency_ms: turnResult.latencyMs,
      modelUsed: turnResult.modelUsed,
      purposeString: turnResult.purposeString,
      receipt: turnResult.receipt,
      docket: turnResult.receipt,
      signature: turnResult.receipt?.signature,
      scoring: turnResult.scoring,
      webGrounding: turnResult.webGrounding,
      promptShield: turnResult.promptShield,
      grantStatus: turnResult.grantStatus,
      paymentInstructions: turnResult.priceCredits > 0
        ? `pay ${PRINCIPAL_ID} ${turnResult.priceCredits} --memo "Galaxia ${turnResult.mode}"`
        : "FREE_TIER"
    });
  } catch (err) {
    console.error("❌ Execution Error:", err);
    res.status(500).json({ error: err.message || "Failed to execute turn through SharedOS kernel." });
  }
};

app.post("/api/v1/execute", handleExecution);
app.post("/api/v1/audit", handleExecution); // Backward-compatible alias

// ==============================================================================
// 5. MODEL CONTEXT PROTOCOL (MCP) ENDPOINT
// ==============================================================================

app.post("/api/mcp", async (req, res) => {
  const { method, params, id = "req_1" } = req.body || {};

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "galaxia_lint",
            description: "Free rapid syntax & sanity check (0 credits).",
            inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] }
          },
          {
            name: "galaxia_review",
            description: "Code intelligence, logic bugs, OWASP/CVE security & refactored fix (5 credits).",
            inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] }
          },
          {
            name: "galaxia_verify",
            description: "Grounded claim verification & fact-checking with live citations (3 credits).",
            inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] }
          },
          {
            name: "galaxia_format",
            description: "Unstructured text & research to clean validated JSON schema extraction (5 credits).",
            inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] }
          },
          {
            name: "galaxia_ask",
            description: "Cognitive strategist, technical analysis & step-by-step resolution plan (5 credits).",
            inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] }
          }
        ]
      }
    });
  }

  if (method === "tools/call") {
    const toolName = params?.name || "";
    const payload = params?.arguments?.input || params?.arguments?.code || params?.arguments?.query || params?.arguments?.text || "";
    const caller = params?.arguments?.caller || "agent:mcp-caller";

    const modeMap = {
      galaxia_lint: "lint",
      galaxia_review: "review",
      galaxia_verify: "verify",
      galaxia_format: "format",
      galaxia_ask: "ask"
    };

    const mode = modeMap[toolName] || "review";

    try {
      const result = await executeGalaxiaTurn({ caller, input: payload, mode });

      const activityEntry = {
        timestamp: new Date().toISOString(),
        caller,
        actor: caller,
        mode: result.mode,
        latency: result.latencyMs,
        latency_ms: result.latencyMs,
        latencyMs: result.latencyMs,
        modelUsed: result.modelUsed,
        receiptId: result.receipt.receiptId,
        receipt_id: result.receipt.receiptId,
        purposeString: result.purposeString,
        priceCredits: result.priceCredits,
        score: result.scoring?.deterministicScore ?? 100,
        deterministic_score: result.scoring?.deterministicScore ?? 100,
        promptShield: result.promptShield?.riskLevel,
        status: "VERIFIED",
        verified: true,
        preview: payload.slice(0, 80) + (payload.length > 80 ? "..." : "")
      };

      activityHistory.unshift(activityEntry);
      if (activityHistory.length > 100) activityHistory.pop();
      stats.totalExecutions++;
      stats.totalLatencyMs += result.latencyMs;
      stats.byMode[result.mode] = (stats.byMode[result.mode] || 0) + 1;
      broadcastActivityEvent(activityEntry);

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `${result.report}\n\n🔒 Receipt: ${result.receipt.receiptId}\n🔑 Ed25519 Signature: ${result.receipt.signature.slice(0, 32)}...\n📊 Score: ${result.scoring.deterministicScore}/100 | Shield: ${result.promptShield.riskLevel}`
            }
          ],
          isError: false,
          _meta: {
            priceCredits: result.priceCredits,
            latencyMs: result.latencyMs,
            purposeString: result.purposeString,
            scoring: result.scoring,
            promptShield: result.promptShield,
            receipt: result.receipt,
            payment: `pay ${PRINCIPAL_ID} ${result.priceCredits} --memo "Galaxia ${mode}"`
          }
        }
      });
    } catch (err) {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true
        }
      });
    }
  }

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "Galaxia-MCP", version: "2.0.0" }
      }
    });
  }

  res.status(400).json({ error: "Unsupported MCP method." });
});

// ==============================================================================
// FALLBACK: Serve index.html for any non-API route
// ==============================================================================
app.get("*", (req, res) => {
  const indexPath = path.join(staticDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: "Frontend not found. Run 'npm run build' first." });
    }
  });
});

// ==============================================================================
// START SERVER
// ==============================================================================

app.listen(PORT, () => {
  console.log("==================================================");
  console.log(`🌌 Galaxia Universal Intelligence Gateway running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 MCP Endpoint: http://localhost:${PORT}/api/mcp`);
  console.log(`⚡ REST API: http://localhost:${PORT}/api/v1/execute`);
  console.log(`🔑 Public Key: http://localhost:${PORT}/api/pubkey`);
  console.log(`🛡️ Receipt Verifier: http://localhost:${PORT}/api/verify`);
  console.log(`🔒 Live Grant Matrix: http://localhost:${PORT}/api/v1/grants`);
  console.log("==================================================");
});
