"""
Arena Tournament Runner for Galaxia AI
Implements Dynamic Discovery for Round 1 (Competitor Critiques) and Round 2 (Market Spending)
"""
import os
import sys
import time
import re
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "https://www.sharednet.ai").rstrip("/")
ROOM_ID = os.getenv("ROOM_ID", "rom_TxTzqEUKyx")
TOKEN_FILE = ".member_token"
MY_PRINCIPAL_ID = os.getenv("MY_PRINCIPAL_ID", "p_wXzmdHhSly")

def get_headers():
    if not os.path.exists(TOKEN_FILE):
        print("❌ .member_token not found. Run python3 agent_bot.py first to join the room.")
        sys.exit(1)
    with open(TOKEN_FILE, "r") as f:
        token = f.read().strip()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def send_room_message(text: str):
    url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
    res = requests.post(url, headers=get_headers(), json={"content": text})
    if res.status_code in (200, 201):
        print(f"📤 [Broadcasted]: {text[:80]}...")
    else:
        print(f"❌ Error sending message: {res.text}")

def fetch_recent_sellers():
    """Discover active agents advertising in the room with their handles and principal IDs."""
    url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
    try:
        res = requests.get(url, headers=get_headers(), params={"limit": 50})
        if res.status_code != 200:
            return []
        data = res.json() or {}
        items = data.get("items") or data.get("messages") or []
        sellers = []
        seen_principals = set()

        for m in items:
            if not isinstance(m, dict):
                continue
            content = m.get("content", "")
            # Look for principal IDs (p_...) and agent handles (@...)
            principals = re.findall(r"\b(p_[a-zA-Z0-9_-]+)\b", content)
            handles = re.findall(r"(@[a-zA-Z0-9_-]+)", content)
            
            for p in principals:
                if p != MY_PRINCIPAL_ID and p not in seen_principals:
                    seen_principals.add(p)
                    handle = handles[0] if handles else f"Agent-{p[:6]}"
                    sellers.append({"principal": p, "handle": handle, "snippet": content[:60]})
        return sellers
    except Exception as e:
        print(f"Discovery notice: {e}")
        return []

def run_round_1_critique():
    """Test active agents discovered in the room."""
    print("\n" + "="*55)
    print("      🚀 LAUNCHING ROUND 1: ARENA CRITIQUE SUITE     ")
    print("="*55)
    sellers = fetch_recent_sellers()
    if not sellers:
        print("ℹ️ No external sellers found in recent messages yet. Waiting for arena activity.")
        return

    print(f"Found {len(sellers)} active agents in the room.")
    for s in sellers[:3]:
        msg = f"{s['handle']} query: Can you describe your service SLA, input format, and pricing?"
        print(f"\n🔍 Inquiring with {s['handle']} ({s['principal']})...")
        send_room_message(msg)
        time.sleep(3)
    print("\n✅ Round 1 inquiries dispatched.")

def run_round_2_market():
    """Distribute 85 credits across >= 3 distinct discovered sellers."""
    print("\n" + "="*55)
    print("      💰 LAUNCHING ROUND 2: MARKET SPEND & SETTLEMENT  ")
    print("="*55)
    sellers = fetch_recent_sellers()
    if len(sellers) < 3:
        print(f"⚠️ Need at least 3 distinct sellers, found {len(sellers)}. Discovering from room...")
        if not sellers:
            print("No external sellers detected yet. Run when competitors have pitched in the room.")
            return

    # Allocate 85 credits across up to 3 sellers (e.g. 30, 30, 25)
    allocations = [30, 30, 25] if len(sellers) >= 3 else [85 // len(sellers)] * len(sellers)
    total_spent = 0

    for i, s in enumerate(sellers[:3]):
        amount = allocations[i] if i < len(allocations) else 25
        memo = f"Galaxia trial purchase from {s['handle']}"
        pay_command = f"pay {s['principal']} {amount} --memo \"{memo}\""
        print(f"\n💳 Executing Purchase ({i+1}/3): {pay_command}")
        send_room_message(pay_command)
        total_spent += amount
        time.sleep(2)

    print(f"\n✅ Round 2 Completed: Allocated {total_spent}/100 credits across {min(len(sellers), 3)} sellers!")

if __name__ == "__main__":
    print("Galaxia Tournament Controller:")
    print("1. Run Round 1 (Discover & Critique Room Agents)")
    print("2. Run Round 2 (Market Spending 85 credits to real sellers)")
    print("3. Run Both")
    choice = input("\nEnter choice [1/2/3]: ").strip()
    if choice == "1":
        run_round_1_critique()
    elif choice == "2":
        run_round_2_market()
    elif choice == "3":
        run_round_1_critique()
        time.sleep(5)
        run_round_2_market()

