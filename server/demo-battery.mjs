import { analyzeWithGalaxia } from "./groq-engine.mjs";
import { generateSignedAuditDocket } from "./kernel.mjs";
import { computeDeterministicScore } from "./static-analyzer.mjs";

const PRINCIPAL_ID = "p_wXzmdHhSly";

const TEST_BATTERY = [
  // TOOL 1: FREE LINT (0 Credits)
  {
    toolName: "1. FREE LINT (0 Credits)",
    mode: "lint",
    price: 0,
    prompts: [
      { trigger: "@Galaxia lint: def sum(a,b): return a+b", desc: "Single line python function" },
      { trigger: "@Galaxia check: const x = 10", desc: "Unused JS variable" },
      { trigger: "Can you quickly lint this: def fetch(url): pass", desc: "Natural language query" },
      { trigger: "@Galaxia lint: function test() { eval('2+2'); }", desc: "eval() usage in JS" },
      { trigger: "@Galaxia check: if True: print('ok')", desc: "Missing function boundary" }
    ]
  },
  // TOOL 2: CODE INTELLIGENCE & SECURITY (5 Credits)
  {
    toolName: "2. CODE INTELLIGENCE & SECURITY (5 Credits)",
    mode: "review",
    price: 5,
    prompts: [
      { trigger: "@Galaxia review: query = f'SELECT * FROM users WHERE id = {user_input}'", desc: "SQL Injection Flaw" },
      { trigger: "@Galaxia security: api_key = 'sk_live_999888777'", desc: "Hardcoded API Secret" },
      { trigger: "Review this code for edge cases: def divide(a, b): return a / b", desc: "Natural language bug check" },
      { trigger: "@Galaxia review: def find_dup(arr): return [x for x in arr if arr.count(x) > 1]", desc: "O(n^2) Loop" },
      { trigger: "@Galaxia security: <div dangerouslySetInnerHTML={{ __html: userBio }} />", desc: "React XSS Flaw" }
    ]
  },
  // TOOL 3: CLAIM VERIFICATION & FACT-CHECKING (3 Credits)
  {
    toolName: "3. GROUNDED CLAIM VERIFICATION (3 Credits)",
    mode: "verify",
    price: 3,
    prompts: [
      { trigger: "@Galaxia verify: The Eiffel Tower was completed in 1889 for the Paris Exposition.", desc: "Historical event check" },
      { trigger: "@Galaxia claim: Python 3.12 completely removed the GIL by default.", desc: "Technical false claim check" },
      { trigger: "Is it true that SQLite is serverless and zero-configuration?", desc: "Natural language technical fact check" },
      { trigger: "@Galaxia verify: The distance from Earth to Moon is roughly 384,400 km.", desc: "Scientific fact check" },
      { trigger: "@Galaxia verify: Bitcoin was created by Vitalik Buterin in 2008.", desc: "Historical crypto false claim" }
    ]
  },
  // TOOL 4: SCHEMA & DATA EXTRACTION (5 Credits)
  {
    toolName: "4. SCHEMA & DATA EXTRACTION (5 Credits)",
    mode: "format",
    price: 5,
    prompts: [
      { trigger: "@Galaxia format: John Doe is a Lead Architect at Stripe based in Dublin earning $210k with Go and Kubernetes.", desc: "Employee profile" },
      { trigger: "@Galaxia json: Order #9821 placed by Alice for 3 units of RTX 4090 totaling $4,800 paid via Card on Sep 12.", desc: "E-commerce invoice text" },
      { trigger: "Parse this into structured json: Server web-01 in us-east-1 is at 98% CPU load with 4GB RAM free.", desc: "Natural language server log" },
      { trigger: "@Galaxia format: Project Apollo budget is $45,000 lead by Sarah with milestone deadline Oct 15.", desc: "Project milestone text" },
      { trigger: "@Galaxia json: Vendor ACME delivers 500 widgets for $2,500 with Net 30 terms.", desc: "B2B procurement invoice" }
    ]
  },
  // TOOL 5: COGNITIVE STRATEGIST & TASKS (5 Credits)
  {
    toolName: "5. COGNITIVE STRATEGIST & DEEP TASKS (5 Credits)",
    mode: "ask",
    price: 5,
    prompts: [
      { trigger: "@Galaxia ask: How to architect an autonomous agent to handle 50 concurrent MCP requests without rate-limiting?", desc: "Architecture strategy" },
      { trigger: "Help me solve this: How should our multi-agent economy price services when demand surges?", desc: "Economic dynamic pricing" },
      { trigger: "@Galaxia ask: What is the optimal failover strategy when primary LLM models return 429 errors?", desc: "Fault tolerance strategy" },
      { trigger: "@Galaxia ask: Step by step plan to migrate from monolithic REST API to MCP Streamable endpoints.", desc: "Migration roadmap" },
      { trigger: "@Galaxia ask: How to detect and neutralize adversarial prompt injection in multi-agent room chat?", desc: "AI Security defense" }
    ]
  }
];

async function runBattery() {
  console.log("================================================================================");
  console.log("             GALAXIA UNIVERSAL MULTI-TOOL DEMONSTRATION SUITE                   ");
  console.log("================================================================================\n");

  for (const tool of TEST_BATTERY) {
    console.log(`\n################################################################################`);
    console.log(`🛠️  TOOL CATEGORY: ${tool.toolName}`);
    console.log(`################################################################################\n`);

    for (let i = 0; i < tool.prompts.length; i++) {
      const p = tool.prompts[i];
      console.log(`--- [Sample ${i + 1}/5] Prompt: "${p.trigger}" (${p.desc}) ---`);
      
      const start = Date.now();
      const res = await analyzeWithGalaxia(p.trigger, tool.mode, "ArenaAgent");
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      
      const deterministic = (tool.mode === "lint" || tool.mode === "review") 
        ? computeDeterministicScore(p.trigger, tool.mode)
        : { deterministicScore: 100 };
        
      const docket = generateSignedAuditDocket("agent:caller", tool.mode, p.trigger, `galaxia.${tool.mode}`, deterministic);

      let paymentClause = "";
      if (tool.price === 0) {
        paymentClause = `\n\n⏱️ *Latency: ${elapsed}s* | 🔒 \`Receipt: ${docket.receiptId} | Kernel: SharedOS-Verified\`\n🟢 *Tier: FREE PROBE (0 Credits)*`;
      } else {
        paymentClause = `\n\n⏱️ *Latency: ${elapsed}s* | 🔒 \`Receipt: ${docket.receiptId} | Kernel: SharedOS-Verified\`\n💰 *Fee (${tool.price} credits):* \`pay ${PRINCIPAL_ID} ${tool.price} --memo "Galaxia ${tool.mode}"\``;
      }

      const deliveredMessage = `@ArenaAgent [Galaxia ${tool.mode.toUpperCase()} Delivery]:\n${res.content}${paymentClause}`;
      
      console.log(deliveredMessage);
      console.log("\n" + "-".repeat(80) + "\n");
    }
  }
}

runBattery().catch(console.error);
