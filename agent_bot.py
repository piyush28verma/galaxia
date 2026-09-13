import os
import sys
import time
import hashlib
import json
import re
import requests
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
MY_PRINCIPAL_ID = os.getenv("MY_PRINCIPAL_ID", "p_wXzmdHhSly")

BASE_URL = os.getenv("BASE_URL", "https://www.sharednet.ai").rstrip("/")
ROOM_ID = os.getenv("ROOM_ID", "rom_TxTzqEUKyx")
INVITE_TOKEN = os.getenv("INVITE_TOKEN", "rit_uAS3KksNuAyrdNC6u4niCTKeNQMXjp2IpPTZGVe4KUU")

AGENT_NAME = "Galaxia-Agent"
AGENT_HANDLE = "@Galaxia"
TOKEN_FILE = ".member_token"

PURPOSE_STRINGS = {
    "lint": "galaxia.lint",
    "review": "galaxia.review",
    "verify": "galaxia.verify",
    "format": "galaxia.format",
    "ask": "galaxia.ask"
}

SUPPORTED_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "groq/compound-mini"
]

SENDER_COOLDOWN_SEC = 5

if not GROQ_API_KEY:
    print("Warning: GROQ_API_KEY is not set in .env")

try:
    from groq import Groq
    groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except ImportError:
    print("Error: 'groq' package not installed. Run: pip install -r requirements.txt")
    sys.exit(1)


def sanitize_output(text: str) -> str:
    """Removes emojis, em-dashes, and formats cleanly."""
    if not text:
        return ""
    # Replace em-dashes / en-dashes
    t = text.replace("—", "-").replace("–", "-")
    # Remove emoji ranges
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F700-\U0001F77F"
        "\U0001F780-\U0001F7FF"
        "\U0001F800-\U0001F8FF"
        "\U0001F900-\U0001F9FF"
        "\U0001FA00-\U0001FA6F"
        "\U0001FA70-\U0001FAFF"
        "\u2600-\u26FF"
        "\u2700-\u27BF"
        "]+",
        flags=re.UNICODE
    )
    return emoji_pattern.sub("", t).strip()


def perform_tavily_search(query: str):
    """Query Tavily Search API for real-time fact checking citations."""
    if not TAVILY_API_KEY:
        return None
    try:
        res = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": TAVILY_API_KEY,
                "query": query,
                "search_depth": "basic",
                "include_answer": True,
                "max_results": 3
            },
            timeout=5
        )
        if res.status_code == 200:
            data = res.json()
            return {
                "answer": data.get("answer", ""),
                "sources": [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")}
                    for r in data.get("results", [])
                ]
            }
    except Exception:
        pass
    return None


def analyze_with_groq(prompt_text: str, mode: str = "review", sender: str = "Agent") -> str:
    """Analyze code/query/claim with Groq using clean formatting and live Tavily grounding."""
    if not groq_client:
        return "[Galaxia Error]: Groq API Key is not configured."

    final_payload = prompt_text
    if mode == "verify":
        web_grounding = perform_tavily_search(prompt_text)
        if web_grounding:
            final_payload = (
                f'Claim to Verify: "{prompt_text}"\n\n'
                f'Live Web Search Findings:\n'
                f'Summary: {web_grounding.get("answer", "N/A")}\n'
                f'Sources: {json.dumps(web_grounding.get("sources", []))}'
            )

    system_prompts = {
        "lint": (
            "You are Galaxia Linter (Free Tier). Perform a rapid syntax, type-sanity, and anti-pattern check.\n"
            "Do not use emojis, em-dashes, tables, or asterisks.\n"
            "Output format:\n"
            "Status: [PASS / WARN / FAIL]\n"
            "Findings: (1-2 clear lines)\n"
            "Recommendation: (1 clear line)\n"
            "Keep total response under 80 words."
        ),
        "review": (
            "You are Galaxia Code Intelligence & Security Auditor on SharedOS.\n"
            "Do not use emojis, em-dashes, tables, or asterisk formatting.\n"
            "Output format:\n"
            "Logic Bugs and Edge Cases: (numbered list)\n"
            "Security and Vulnerabilities: (OWASP/CVE and secret leaks list)\n"
            "Refactored Code Fix: (clean code block)\n"
            "Code Quality Score: X/10"
        ),
        "verify": (
            "You are Galaxia Grounded Fact-Checking & Claim Verification Bureau.\n"
            "Do not use emojis, em-dashes, tables, or asterisk formatting.\n"
            "Output format:\n"
            "Verdict: [SUPPORTED / CONTRADICTED / UNVERIFIED]\n"
            "Evidence and Analysis: (clear summary)\n"
            "Sources and Grounding: (authoritative sources list)\n"
            "Confidence Score: X/10"
        ),
        "format": (
            "You are Galaxia Schema & Data Extraction Tool.\n"
            "Extract clean, validated, structured JSON from the provided text.\n"
            "Output valid JSON inside a standard json code block."
        ),
        "ask": (
            "You are Galaxia Cognitive Strategist & Deep Reasoning Tool.\n"
            "Do not use emojis, em-dashes, tables, or asterisk formatting.\n"
            "Output format:\n"
            "Problem Analysis: (clear summary)\n"
            "Executive Summary: (2-3 sentences)\n"
            "Action Plan: (numbered steps)\n"
            "Recommendations: (actionable points)"
        )
    }

    selected_prompt = system_prompts.get(mode, system_prompts["review"])

    for model_name in SUPPORTED_MODELS:
        try:
            completion = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": selected_prompt},
                    {"role": "user", "content": f"Request from {sender} [{mode}]:\n{final_payload}"}
                ],
                temperature=0.1,
                max_tokens=650,
            )
            raw = completion.choices[0].message.content.strip()
            return sanitize_output(raw)
        except Exception:
            continue

    return "[Galaxia]: Service temporarily busy. Please retry in a few seconds."


def generate_attestation_receipt(target_payload: str, mode: str, sender: str) -> str:
    purpose = PURPOSE_STRINGS.get(mode, "galaxia.audit")
    digest = hashlib.sha256(f"{sender}:{mode}:{purpose}:{target_payload}:{time.time()}".encode()).hexdigest()[:12]
    return f"Receipt: att_sha256_{digest} | Kernel: SharedOS-Verified | Purpose: {purpose}"


def detect_intent(content: str) -> tuple:
    lower = content.lower().strip()
    cleaned = re.sub(r"@galaxia\b", "", content, flags=re.IGNORECASE).strip()

    if lower.startswith("lint:") or "lint:" in lower or lower.startswith("check:") or "check:" in lower:
        body = cleaned.split("lint:", 1)[-1].strip() if "lint:" in lower else cleaned.split("check:", 1)[-1].strip()
        return "lint", True, 0, body
    if lower.startswith("review:") or "review:" in lower or lower.startswith("security:") or "security:" in lower:
        body = cleaned.split("review:", 1)[-1].strip() if "review:" in lower else cleaned.split("security:", 1)[-1].strip()
        return "review", False, 5, body
    if lower.startswith("verify:") or "verify:" in lower or lower.startswith("claim:") or "claim:" in lower:
        body = cleaned.split("verify:", 1)[-1].strip() if "verify:" in lower else cleaned.split("claim:", 1)[-1].strip()
        return "verify", False, 3, body
    if lower.startswith("format:") or "format:" in lower or lower.startswith("json:") or "json:" in lower:
        body = cleaned.split("format:", 1)[-1].strip() if "format:" in lower else cleaned.split("json:", 1)[-1].strip()
        return "format", False, 5, body
    if lower.startswith("ask:") or "ask:" in lower or lower.startswith("task:") or "task:" in lower:
        body = cleaned.split("ask:", 1)[-1].strip() if "ask:" in lower else cleaned.split("task:", 1)[-1].strip()
        return "ask", False, 5, body

    if any(q in lower for q in ["is it true", "verify if", "fact check", "search for", "who is", "what is"]):
        return "verify", False, 3, cleaned
    if any(q in lower for q in ["format to json", "convert to json", "extract json", "parse into schema"]):
        return "format", False, 5, cleaned
    if any(q in lower for q in ["how to", "solve this", "plan for", "help me with", "strategy for"]):
        return "ask", False, 5, cleaned
    if any(c in cleaned for c in ["def ", "function ", "class ", "SELECT ", "import ", "const "]):
        return "review", False, 5, cleaned

    return "ask", False, 5, cleaned


class SharedNetAgent:
    def __init__(self):
        self.member_token = self._load_or_join()
        self.headers = {
            "Authorization": f"Bearer {self.member_token}",
            "Content-Type": "application/json"
        }
        self.last_seq = 0
        self.sender_history = {}

    def _load_or_join(self) -> str:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, "r") as f:
                token = f.read().strip()
                if token:
                    print(f"Loaded existing seat token from {TOKEN_FILE}")
                    return token

        print(f"Joining SharedNet Room {ROOM_ID}...")
        url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/join"
        headers = {
            "Authorization": f"Bearer {INVITE_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "name": AGENT_NAME,
            "runtime": {"kind": "custom"}
        }
        
        res = requests.post(url, headers=headers, json=payload)
        if res.status_code not in (200, 201):
            raise RuntimeError(f"Join failed [{res.status_code}]: {res.text}")
        
        data = res.json()
        token = data.get("member_token")
        if not token:
            raise RuntimeError(f"No member_token returned: {data}")
        
        with open(TOKEN_FILE, "w") as f:
            f.write(token)
            
        print(f"Joined successfully! Saved token to {TOKEN_FILE}")
        return token

    def send_message(self, content: str):
        url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
        res = requests.post(url, headers=self.headers, json={"content": content})
        if res.status_code not in (200, 201):
            print(f"Failed to send message [{res.status_code}]: {res.text}")
        return res

    def init_cursor(self):
        url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
        try:
            res = requests.get(url, headers=self.headers, params={"limit": 1})
            if res.status_code == 200:
                data = res.json() or {}
                items = data.get("items") or data.get("messages") or []
                if items:
                    self.last_seq = max(int(m.get("sequence", 0) or 0) for m in items if isinstance(m, dict))
                cursor = data.get("next_cursor")
                if cursor is not None:
                    self.last_seq = max(self.last_seq, int(cursor))
                print(f"Stream cursor initialized at sequence={self.last_seq}")
        except Exception as e:
            print(f"Cursor notice: {e}")

    def announce_presence(self):
        pitch = (
            f"{AGENT_HANDLE} ONLINE - Universal Intelligence & Assurance Tool (< 1s SLA)\n\n"
            f"FREE TIER: `{AGENT_HANDLE} lint: <input>` (Fast syntax & sanity check)\n\n"
            f"UNIVERSAL SERVICES:\n"
            f"- `{AGENT_HANDLE} review: <code>` (5cr) Code review, security scan, and clean fix\n"
            f"- `{AGENT_HANDLE} verify: <claim>` (3cr) Grounded claim verification and truth rating\n"
            f"- `{AGENT_HANDLE} format: <text>` (5cr) Raw text to structured JSON schema\n"
            f"- `{AGENT_HANDLE} ask: <task>` (5cr) Technical analysis and resolution plan\n\n"
            f"MCP & REST: /api/mcp | POST /api/v1/execute\n"
            f"Pay: `pay {MY_PRINCIPAL_ID} <credits> --memo \"Galaxia <service>\"`"
        )
        print("Broadcasting pitch to Room...")
        self.send_message(pitch)

    def run(self):
        self.init_cursor()
        self.announce_presence()
        
        print("\nGalaxia Agent is listening for tasks in the Arena...\n")
        
        while True:
            try:
                url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/wait"
                params = {"after": self.last_seq}
                
                res = requests.get(url, headers=self.headers, params=params, timeout=30)
                
                if res.status_code == 200:
                    data = res.json() or {}
                    items = data.get("items") or data.get("messages") or []
                    for msg in items:
                        if not isinstance(msg, dict):
                            continue
                        seq = int(msg.get("sequence", self.last_seq) or self.last_seq)
                        if seq > self.last_seq:
                            self.last_seq = seq
                        self.handle_incoming_message(msg)

                    cursor = data.get("next_cursor")
                    if cursor is not None:
                        self.last_seq = max(self.last_seq, int(cursor))

                elif res.status_code == 304:
                    continue
                else:
                    time.sleep(3)

            except requests.exceptions.Timeout:
                continue
            except KeyboardInterrupt:
                print("\nAgent stopped by user.")
                break
            except Exception as e:
                print(f"Polling error: {e}")
                time.sleep(3)

    def handle_incoming_message(self, msg: dict):
        if not isinstance(msg, dict):
            return

        raw_content = msg.get("content")
        if not raw_content or not isinstance(raw_content, str):
            return

        content = raw_content.strip()
        if not content:
            return

        sender_data = msg.get("sender")
        if isinstance(sender_data, dict):
            sender_name = str(sender_data.get("name") or "Anonymous")
        elif isinstance(sender_data, str):
            sender_name = sender_data
        else:
            sender_name = str(msg.get("sender_name") or "Anonymous")

        if AGENT_NAME in sender_name or AGENT_HANDLE in sender_name:
            return

        lower = content.lower()
        is_targeted = (
            AGENT_HANDLE.lower() in lower or 
            "galaxia" in lower or
            lower.startswith("lint:") or
            lower.startswith("review:") or
            lower.startswith("verify:") or
            lower.startswith("format:") or
            lower.startswith("ask:")
        )

        if not is_targeted:
            return

        now = time.time()
        last_time = self.sender_history.get(sender_name, 0)
        if now - last_time < SENDER_COOLDOWN_SEC:
            return
        self.sender_history[sender_name] = now

        print(f"\nIncoming task from [{sender_name}]: {content[:70]}...")

        if any(w in lower for w in ["price", "cost", "how much", "credits", "menu", "services"]):
            reply = (
                f"@{sender_name} Galaxia Services Menu:\n"
                f"- `lint:` Free (0 cr)\n"
                f"- `verify:` 3 cr\n"
                f"- `review:`, `format:`, `ask:` 5 cr\n"
                f"Pay: `pay {MY_PRINCIPAL_ID} 5 --memo \"Galaxia service\"`"
            )
            self.send_message(reply)
            return

        if any(w in lower for w in ["paid", "pay ", "transfer", "sent credits"]):
            reply = f"@{sender_name} Payment received with thanks. Send tasks anytime with `{AGENT_HANDLE} <command>: <input>`."
            self.send_message(reply)
            return

        mode, is_free, price, payload = detect_intent(content)

        print(f"Intent Routed: [{mode.upper()}] (Price: {price} cr) for [{sender_name}]...")
        start_t = time.time()
        result = analyze_with_groq(payload, mode=mode, sender=sender_name)
        elapsed = round(time.time() - start_t, 2)
        receipt = generate_attestation_receipt(payload, mode, sender_name)

        if is_free:
            payment_clause = f"\n\nLatency: {elapsed}s | {receipt}\nTier: FREE PROBE (0 Credits)"
        else:
            payment_clause = (
                f"\n\nLatency: {elapsed}s | {receipt}\n"
                f"Fee ({price} credits): `pay {MY_PRINCIPAL_ID} {price} --memo \"Galaxia {mode}\"`"
            )

        reply_content = f"@{sender_name} [Galaxia {mode.title()} Report]:\n{result}{payment_clause}"

        self.send_message(reply_content)
        print(f"Delivered [{mode.upper()}] in {elapsed}s to [{sender_name}]!")


if __name__ == "__main__":
    print("==================================================")
    print("      GALAXIA - UNIVERSAL INTELLIGENCE AGENT      ")
    print("==================================================")
    agent = SharedNetAgent()
    agent.run()
