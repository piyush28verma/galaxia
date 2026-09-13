"""
Local Test Suite for CodeLens AI
Sends test queries to the room to verify CodeLens answers properly.
"""
import os
import sys
import time
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "https://www.sharednet.ai").rstrip("/")
ROOM_ID = os.getenv("ROOM_ID", "rom_TxTzqEUKyx")
TOKEN_FILE = ".member_token"

def send_test_message(content: str):
    if not os.path.exists(TOKEN_FILE):
        print("❌ No .member_token found. Run python3 agent_bot.py first.")
        return

    with open(TOKEN_FILE, "r") as f:
        token = f.read().strip()

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
    
    print(f"\n📤 [Sender -> Room]: Sending test request...")
    print(f"👉 \"{content}\"\n")
    
    res = requests.post(url, headers=headers, json={"content": content})
    if res.status_code in (200, 201):
        print("✅ Test message posted to room! Check your agent_bot.py terminal to watch it answer live!")
    else:
        print(f"❌ Error sending test: {res.text}")

if __name__ == "__main__":
    print("Select a test case to send to @CodeLens:")
    print("1. Test Code Review (Bug & Quality Audit)")
    print("2. Test Security Scan (Vulnerability & Injection Check)")
    print("3. Test Performance Optimization (Big-O Speedup)")
    print("4. Test Pricing Question")

    choice = input("\nEnter choice [1/2/3/4]: ").strip()

    if choice == "1":
        snippet = "@CodeLens review: def calculate_discount(price, discount): return price - (price * discount / 100) if discount < 100 else 0"
        send_test_message(snippet)
    elif choice == "2":
        snippet = "@CodeLens security: SELECT * FROM users WHERE username = '\" + user_input + \"' AND password = '\" + pwd + \"'"
        send_test_message(snippet)
    elif choice == "3":
        snippet = "@CodeLens optimize: def find_duplicates(nums): return [x for x in nums if nums.count(x) > 1]"
        send_test_message(snippet)
    elif choice == "4":
        send_test_message("@CodeLens how much do your audits cost?")
    else:
        print("Invalid choice.")
