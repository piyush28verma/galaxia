import { executeGalaxiaTurn, kernel, PURPOSE_STRINGS, getGrantMatrix } from "./kernel.mjs";
import { getPublicKey, verifySignature } from "./crypto-signatures.mjs";

console.log("================================================================");
console.log("           GALAXIA — COMPREHENSIVE END-TO-END TEST SUITE        ");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runE2ESuite() {
  // --------------------------------------------------------------------------
  // TEST 1: FREE VS PAID TIER SPLIT (Product Requirement 1)
  // --------------------------------------------------------------------------
  console.log("▶️ [TEST 1] Verifying Free vs. Paid Tier Split...");

  const freeLintResult = await executeGalaxiaTurn({
    caller: "agent:buyer-test",
    input: "def add(x, y): return x + y",
    mode: "lint"
  });

  assert(freeLintResult.priceCredits === 0, "Free lint tool costs strictly 0 credits");
  assert(freeLintResult.purposeString === "galaxia.lint", "Purpose string is 'galaxia.lint'");
  assert(freeLintResult.receipt?.receiptId?.startsWith("att_sha256_"), "Free tier generates cryptographic receipt");
  assert(freeLintResult.receipt?.signature?.startsWith("sig_ed25519_"), "Receipt carries Ed25519 signature");

  const paidReviewResult = await executeGalaxiaTurn({
    caller: "agent:buyer-test",
    input: "def divide(a, b): return a / b",
    mode: "review"
  });

  assert(paidReviewResult.priceCredits === 5, "Paid review tool costs strictly 5 credits");
  assert(paidReviewResult.purposeString === "galaxia.review", "Purpose string is 'galaxia.review'");
  assert(paidReviewResult.report.length > 50, "Review generated substantive report");

  // --------------------------------------------------------------------------
  // TEST 2: CLAIM VERIFICATION & SCHEMA EXTRACTION TOOLS
  // --------------------------------------------------------------------------
  console.log("\n▶️ [TEST 2] Verifying Claim Verification & Schema Extraction...");

  const verifyResult = await executeGalaxiaTurn({
    caller: "agent:fact-checker",
    input: "The speed of light in vacuum is approximately 299,792,458 meters per second.",
    mode: "verify"
  });
  assert(verifyResult.priceCredits === 3, "Claim verification costs strictly 3 credits");
  assert(verifyResult.purposeString === "galaxia.verify", "Purpose string is 'galaxia.verify'");

  const formatResult = await executeGalaxiaTurn({
    caller: "agent:data-extractor",
    input: "Acme Corp raised $10M Series A led by Matrix Partners on Jan 2026.",
    mode: "format"
  });
  assert(formatResult.priceCredits === 5, "Schema format costs strictly 5 credits");
  assert(formatResult.purposeString === "galaxia.format", "Purpose string is 'galaxia.format'");

  // --------------------------------------------------------------------------
  // TEST 3: SHAREDOS KERNEL & BOUNDED GRANTS
  // --------------------------------------------------------------------------
  console.log("\n▶️ [TEST 3] Verifying SharedOS Kernel & Bounded Grants...");

  assert(kernel !== undefined, "SharedOSKernel instance exists and is initialized");
  const grantMatrix = getGrantMatrix();
  assert(grantMatrix.length === 5, "All 5 capabilities represented in Bounded Grant Matrix");
  assert(grantMatrix.every(g => g.status === "ACTIVE"), "All grants report ACTIVE state");

  // --------------------------------------------------------------------------
  // TEST 4: CRYPTOGRAPHIC ED25519 SIGNATURE VERIFICATION
  // --------------------------------------------------------------------------
  console.log("\n▶️ [TEST 4] Verifying Ed25519 Cryptographic Verification...");

  const cleanDocket = { ...verifyResult.receipt };
  delete cleanDocket.signature;
  delete cleanDocket.signatureAlgorithm;
  const verifySig = verifySignature(cleanDocket, verifyResult.receipt.signature);
  assert(verifySig.valid === true, "Ed25519 receipt cryptographically verified as valid and untampered");

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`🎉 GALAXIA E2E TEST RUN COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ESuite().catch(err => {
  console.error("FATAL E2E ERROR:", err);
  process.exit(1);
});
