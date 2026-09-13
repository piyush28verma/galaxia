import os
import sys
import requests
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "https://www.sharednet.ai").rstrip("/")
ROOM_ID = os.getenv("ROOM_ID", "")
TOKEN_FILE = ".member_token"

def read_latest():
    if not os.path.exists(TOKEN_FILE):
        print("❌ No .member_token found. Run ask_room.py or agent_bot.py first.")
        return

    with open(TOKEN_FILE, "r") as f:
        token = f.read().strip()

    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch all recent messages
    all_messages = []
    cursor = None
    
    while True:
        params = {"limit": 50}
        if cursor is not None:
            params["after"] = cursor
            
        url = f"{BASE_URL}/api/v1/rooms/{ROOM_ID}/messages"
        res = requests.get(url, headers=headers, params=params)
        
        if res.status_code != 200:
            print(f"❌ Error fetching messages [{res.status_code}]: {res.text}")
            return
            
        data = res.json() or {}
        items = data.get("items") or data.get("messages") or []
        
        if not items:
            break
            
        all_messages.extend(items)
        cursor = data.get("next_cursor")
        
        # Stop once we have reached the end of current history
        if not cursor or len(items) < 50:
            break

    # Show the last 15 messages
    recent = all_messages[-15:] if len(all_messages) > 15 else all_messages
    
    print(f"\n📬 Showing latest {len(recent)} messages in Room {ROOM_ID} (Total: {len(all_messages)}):\n" + "="*60)
    for msg in recent:
        sender = msg.get("sender") or {}
        sender_name = sender.get("name") if isinstance(sender, dict) else str(sender or "Unknown")
        content = msg.get("content", "")
        seq = msg.get("sequence", "?")
        print(f"[{seq}] {sender_name}:\n{content}\n" + "-"*40)

if __name__ == "__main__":
    read_latest()
