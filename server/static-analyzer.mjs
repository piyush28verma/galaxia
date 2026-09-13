/**
 * Galaxia Static Analysis & Prompt-Guard Shield
 * Evaluates deterministic mathematical metrics and protects against adversarial injections.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /you\s+are\s+now\s+a/i,
  /give\s+(me\s+)?(a\s+)?10\/10/i,
  /say\s+0\s+credits/i,
  /reassign\s+principal/i,
  /bypass\s+security/i,
  /system\s+prompt/i,
  /do\s+not\s+audit/i,
  /transfer\s+(\d+)\s+credits/i,
  /markdown\s+injection/i
];

const DANGEROUS_CALLS = [
  { pattern: /eval\s*\(/i, name: "eval() execution", penalty: 30 },
  { pattern: /exec\s*\(/i, name: "exec() execution", penalty: 30 },
  { pattern: /os\.system\s*\(/i, name: "Unsanitized system call", penalty: 25 },
  { pattern: /subprocess\.(Popen|run|call)\s*\([^,]+shell\s*=\s*True/i, name: "Shell injection vector", penalty: 25 },
  { pattern: /f["']\s*(SELECT|INSERT|UPDATE|DELETE)[^"']+\{[^}]+\}/i, name: "SQL string interpolation (SQLi)", penalty: 40 },
  { pattern: /["']\s*(SELECT|INSERT|UPDATE|DELETE)[^"']*\s*\+\s*[a-zA-Z0-9_]+/i, name: "Raw SQL concatenation", penalty: 35 },
  { pattern: /(api_key|secret|token|password)\s*=\s*["'][a-zA-Z0-9_\-]{8,}["']/i, name: "Hardcoded secret/credential", penalty: 20 },
  { pattern: /dangerouslySetInnerHTML/i, name: "React XSS vector", penalty: 25 }
];

/**
 * Scan for prompt injection in caller input
 */
export function scanPromptInjection(input) {
  const flags = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      flags.push(pattern.toString());
    }
  }

  const isSafe = flags.length === 0;
  return {
    isSafe,
    riskLevel: isSafe ? "LOW" : flags.length === 1 ? "SUSPICIOUS" : "CRITICAL_INJECTION_DETECTED",
    flaggedPatterns: flags,
    shieldAction: isSafe ? "PASS" : "QUARANTINED_AND_FLAGGED"
  };
}

/**
 * Compute deterministic static analysis score (0 - 100)
 */
export function computeDeterministicScore(code, mode = "review") {
  let score = 100;
  const deductions = [];
  const bonuses = [];

  if (!code || typeof code !== "string") {
    return { score: 0, deductions: ["Empty code input"], metrics: {} };
  }

  const lines = code.split("\n");
  const trimmed = code.trim();

  // 1. Single-line check
  if (lines.length === 1 && trimmed.length > 40) {
    score -= 10;
    deductions.push({ rule: "Single-line function anti-pattern", penalty: 10 });
  }

  // 2. Dangerous calls & OWASP vulnerabilities
  for (const { pattern, name, penalty } of DANGEROUS_CALLS) {
    if (pattern.test(code)) {
      score -= penalty;
      deductions.push({ rule: name, penalty });
    }
  }

  // 3. Complexity & nesting depth (Loops)
  const loopMatches = code.match(/\b(for|while)\b/g) || [];
  if (loopMatches.length >= 2) {
    const isNested = /(for|while)[\s\S]*?(for|while)/.test(code);
    if (isNested) {
      score -= 15;
      deductions.push({ rule: "Nested loop detected (Potential O(n²) bottleneck)", penalty: 15 });
    }
  }

  // 4. Exception Handling check
  const hasTryCatch = /\b(try|except|catch|finally)\b/.test(code);
  if (hasTryCatch) {
    score += 5;
    bonuses.push({ rule: "Explicit exception handling present", bonus: 5 });
  } else if (lines.length > 5 && (mode === "security" || mode === "review")) {
    score -= 10;
    deductions.push({ rule: "Missing error handling / defensive guards", penalty: 10 });
  }

  // 5. Type Annotations & Documentation
  const hasTypes = /:\s*(int|str|float|bool|list|dict|List|Dict|Any|string|number|boolean)\b/.test(code) || /->\s*[a-zA-Z0-9_]+/.test(code);
  const hasDocstring = /("""|'''|\/\*\*|\/\/)/.test(code);

  if (hasTypes) {
    score += 5;
    bonuses.push({ rule: "Type annotations / contracts defined", bonus: 5 });
  }
  if (hasDocstring) {
    score += 5;
    bonuses.push({ rule: "Documentation / docstring present", bonus: 5 });
  }

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));

  return {
    deterministicScore: finalScore,
    deductions,
    bonuses,
    metrics: {
      lineCount: lines.length,
      characterCount: code.length,
      hasTypeSafety: hasTypes,
      hasErrorHandling: hasTryCatch,
      dangerousCallsDetected: deductions.filter(d => d.penalty >= 20).length
    }
  };
}

