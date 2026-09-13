import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config();

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SUPPORTED_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
  "groq/compound-mini"
];

// Clean, concise, professional prompts without tables, emojis, or em-dashes
const SYSTEM_PROMPTS = {
  lint: `You are Galaxia Linter (Free Tier).
STRICT INSTRUCTIONS:
- Give a rapid syntax, type-sanity, and anti-pattern check.
- Keep response under 60 words.
- STRICTLY NO MARKDOWN TABLES (DO NOT use "|" tables).
- STRICTLY NO EMOJIS of any kind.
- STRICTLY NO EM-DASHES (use standard hyphen "-").

Output structure:
Status: [PASS / WARN / FAIL]
Findings:
- (1-2 concise bullet points)
Recommendation:
- (1 concise bullet point)`,

  review: `You are Galaxia Code Intelligence, an autonomous code reviewer and security auditor on SharedOS.
STRICT INSTRUCTIONS:
- Give a small, concise, to-the-point code review in clean bullet points.
- Keep response under 150 words.
- STRICTLY NO MARKDOWN TABLES (DO NOT use "|" tables).
- STRICTLY NO EMOJIS of any kind (e.g. no 1️⃣, 🔍, 🛡️, etc.).
- STRICTLY NO EM-DASHES (use standard hyphen "-").

Output structure:
Logic Bugs & Edge Cases:
- (1-2 concise bullet points detailing potential issues)

Security & Vulnerabilities:
- (1-2 concise bullet points covering OWASP/CVE/secrets, or "None identified")

Refactored Code Fix:
\`\`\`[language]
(clean refactored code block)
\`\`\`

Code Quality Score: X/10`,

  verify: `You are Galaxia Grounded Fact-Checking Bureau.
STRICT INSTRUCTIONS:
- Give a concise, evidence-based verification.
- Keep response under 120 words.
- STRICTLY NO MARKDOWN TABLES (DO NOT use "|" tables).
- STRICTLY NO EMOJIS of any kind.
- STRICTLY NO EM-DASHES (use standard hyphen "-").

Output structure:
Verdict: [SUPPORTED / CONTRADICTED / UNVERIFIED]
Evidence:
- (2-3 concise bullet points with direct facts)
Sources:
- (1-2 source names or URLs)
Confidence Score: X/10`,

  format: `You are Galaxia Schema Extraction Tool.
Extract clean, validated, structured JSON from the input.
STRICT INSTRUCTIONS:
- Output ONLY valid JSON inside a \`\`\`json code block.
- STRICTLY NO MARKDOWN TABLES, NO EMOJIS, and NO conversational prose.

\`\`\`json
{
  "summary": "...",
  "structuredData": {},
  "schemaValidation": "VALID"
}
\`\`\``,

  ask: `You are Galaxia Cognitive Strategist.
STRICT INSTRUCTIONS:
- Give a direct, structured, step-by-step resolution plan.
- Keep response under 140 words.
- STRICTLY NO MARKDOWN TABLES (DO NOT use "|" tables).
- STRICTLY NO EMOJIS of any kind.
- STRICTLY NO EM-DASHES (use standard hyphen "-").

Output structure:
Summary:
- (1-2 concise bullet points)

Step-by-Step Action Plan:
1. (Actionable step)
2. (Actionable step)
3. (Actionable step)

Key Recommendation:
- (1 concise takeaway)`
};

/**
 * Clean text of any markdown tables, em-dashes, emojis, and unwanted formatting
 */
function sanitizeOutputText(text) {
  if (!text || typeof text !== "string") return "";

  // 1. Replace em/en dashes
  let cleaned = text.replace(/[—–]/g, "-");

  // 2. Remove all emoji characters and emoji symbols
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}]/gu, "");
  cleaned = cleaned.replace(/[0-9]️⃣|🔟/g, "");

  // 3. Flatten / sanitize markdown tables if model generated any
  const lines = cleaned.split("\n");
  const processedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip markdown table delimiter lines like |---|---|
    if (/^\|?\s*[-:]+\s*\|[-:|\s]+$/.test(trimmed)) {
      continue;
    }
    // If table header or data row: convert | col1 | col2 | into bullet points
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map(c => c.trim())
        .filter(Boolean);
      if (cells.length > 0) {
        // If it's not a generic header like "Area | Observation | Impact"
        if (!cells.some(c => /^(area|check|field|heading|column|result|recommendation)$/i.test(c))) {
          processedLines.push(`- ${cells.join(": ")}`);
        }
      }
      continue;
    }
    processedLines.push(line);
  }

  return processedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Perform live web search via Tavily API (if key available)
 */
async function performTavilySearch(query) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "basic",
        include_answer: true,
        max_results: 3
      })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        answer: data.answer,
        sources: (data.results || []).map(r => ({ title: r.title, url: r.url, snippet: r.content }))
      };
    }
  } catch {
    // fallback to model reasoning
  }
  return null;
}

/**
 * Execute Galaxia AI Inference with model failover and live grounding
 */
export async function analyzeWithGalaxia(payloadText, mode = "review", sender = "ArenaAgent") {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return { content: "[Galaxia Error]: GROQ_API_KEY is not configured in .env.", modelUsed: "none" };
  }

  let finalPayload = payloadText;
  let webGrounding = null;

  if (mode === "verify") {
    webGrounding = await performTavilySearch(payloadText);
    if (webGrounding) {
      finalPayload = `Claim to Verify: "${payloadText}"\n\nLive Web Search Findings:\nSummary: ${webGrounding.answer || "N/A"}\nSources: ${JSON.stringify(webGrounding.sources)}`;
    }
  }

  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS["review"];
  const userContent = `Caller: ${sender}\nMode: ${mode}\nPayload:\n\`\`\`\n${finalPayload}\n\`\`\``;

  let lastError = null;

  for (const model of SUPPORTED_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          temperature: 0.1,
          max_tokens: 380
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          const cleanedContent = sanitizeOutputText(content);
          return { content: cleanedContent, modelUsed: model, webGrounding };
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`Groq ${model} [${response.status}]: ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  return {
    content: `[Galaxia Notice]: Upstream models busy (${lastError?.message || "timeout"}).`,
    modelUsed: "fallback-notice",
    webGrounding: null
  };
}
