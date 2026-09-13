import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "https://www.sharednet.ai").rstrip("/")
ROOM_ID = os.getenv("ROOM_ID", "rom_TxTzqEUKyx")
INVITE_TOKEN = os.getenv("INVITE_TOKEN", "rit_uAS3KksNuAyrdNC6u4niCTKeNQMXjp2IpPTZGVe4KUU")
TOKEN_FILE = ".member_token"

def get_token():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            token = f.read().strip()
            if token:
                return token
    
    # If not joined yet, join
    url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/join"
    res = requests.post(url, headers={"Authorization": f"Bearer {INVITE_TOKEN}"}, json={"name": "Piyush", "runtime": {"kind": "custom"}})
    if res.status_code in (200, 201):
        token = res.json().get("member_token")
        with open(TOKEN_FILE, "w") as f:
            f.write(token)
        return token
    raise RuntimeError(f"Could not get member token: {res.text}")

def send_question(text: str):
    token = get_token()
    url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
    res = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"content": text}
    )
    if res.status_code in (200, 201):
        print(f"\n✅ Sent message to Q&A Room ({ROOM_ID}):\n👉 \"{text}\"\n")
    else:
        print(f"\n❌ Error sending message [{res.status_code}]: {res.text}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
    else:
        print("💬 Enter your question for the Organizer Agent in the Q&A Room:")
        question = input("> ")

    if question.strip():
        send_question(question.strip())
    else:
        print("⚠️ No message entered.")
