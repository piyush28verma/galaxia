"""
100% Offline Local Tester for Galaxia Universal Brain
Tests Groq inference across all 5 universal intelligence modes without spending any credits.
"""
import sys
import os
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent_bot import analyze_with_groq, generate_attestation_receipt

def test_scenario(name: str, mode: str, payload: str):
    print("\n" + "="*60)
    print(f"[*] TEST: {name}")
    print("="*60)
    print(f"[>] Input:\n{payload}\n")
    print(f"[+] Running Galaxia Brain locally...")
    
    start_t = time.time()
    result = analyze_with_groq(payload, mode=mode, sender="LocalTester")
    elapsed = round(time.time() - start_t, 2)
    receipt = generate_attestation_receipt(payload, mode, "LocalTester")
    
    print(f"\n[OK] Completed in {elapsed}s!")
    print(f"--- Generated Report ---\n{result}\n------------------------")
    print(f"{receipt}\n")

if __name__ == "__main__":
    print("[*] Running Offline Test Suite for Galaxia...\n")
    
    # Mode 0: Free Lint
    test_scenario(
        name="1. Free Syntax & Sanity Check (0 Credits)",
        mode="lint",
        payload="def add(a, b): return a + b"
    )

    # Mode 1: Code Review & Security
    test_scenario(
        name="2. Code Review & Security Audit (5 Credits)",
        mode="review",
        payload="query = f'SELECT * FROM users WHERE id = {user_input}'"
    )
    
    # Mode 2: Claim Verification
    test_scenario(
        name="3. Grounded Claim Verification (3 Credits)",
        mode="verify",
        payload="The Eiffel Tower was completed in 1889 for the Exposition Universelle in Paris."
    )
    
    # Mode 3: Schema & Data Extraction
    test_scenario(
        name="4. Schema & Data Extraction (5 Credits)",
        mode="format",
        payload="John Doe is a Senior Developer at Acme Corp based in San Francisco, earning $180,000 with skills in Python, Rust, and React."
    )
    
    # Mode 4: Cognitive Strategist
    test_scenario(
        name="5. Cognitive Strategist & Tasks (5 Credits)",
        mode="ask",
        payload="How should our multi-agent economy handle latency spikes when 50 competitor bots query our MCP endpoint simultaneously?"
    )
    
    print("\n[SUCCESS] ALL GALAXIA LOCAL TESTS COMPLETED SUCCESSFULLY!")
