import os
import json
import time
import requests
import subprocess
from pathlib import Path
from datetime import datetime

DOWNLOAD_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\downloads")
URLS_FILE = DOWNLOAD_DIR / "upload_urls.txt"
STATUS_FILE = DOWNLOAD_DIR / "upload_status.json"
CATBOX_URL = "https://catbox.moe/user/api.php"
MAX_SIZE = 200 * 1024 * 1024
REPO_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory")

def load_status():
    if STATUS_FILE.exists():
        return json.loads(STATUS_FILE.read_text())
    return {"uploaded": {}, "failed": [], "last_update": ""}

def save_status(status):
    status["last_update"] = datetime.now().isoformat()
    STATUS_FILE.write_text(json.dumps(status, indent=2))

def git_commit(message):
    try:
        subprocess.run(["git", "add", "."], cwd=REPO_DIR, capture_output=True)
        subprocess.run(["git", "commit", "-m", message], cwd=REPO_DIR, capture_output=True)
        return True
    except:
        return False

def upload(file_path):
    for attempt in range(3):
        try:
            with open(file_path, 'rb') as f:
                resp = requests.post(
                    CATBOX_URL,
                    data={"reqtype": "fileupload", "userhash": ""},
                    files={"fileToUpload": (file_path.name, f, "video/mp4")},
                    timeout=600
                )
            if resp.status_code == 200 and resp.text.startswith("https://"):
                return resp.text.strip()
        except:
            pass
        time.sleep(5)
    return None

def main():
    status = load_status()
    mp4_files = sorted(DOWNLOAD_DIR.glob("*.mp4"))
    to_upload = [f for f in mp4_files if f.stem not in status["uploaded"]]
    
    print(f"Total: {len(mp4_files)}, On cloud: {len(status['uploaded'])}, To upload: {len(to_upload)}")
    
    success = 0
    failed = 0
    
    for i, f in enumerate(to_upload, 1):
        size_mb = f.stat().st_size / (1024 * 1024)
        
        if f.stat().st_size > MAX_SIZE:
            print(f"[{i}/{len(to_upload)}] SKIP {f.stem} ({size_mb:.1f}MB > 200MB)")
            status["failed"].append({"id": f.stem, "reason": "too_large", "time": datetime.now().isoformat()})
            failed += 1
            continue
        
        print(f"[{i}/{len(to_upload)}] {f.stem} ({size_mb:.1f}MB)...", end=" ", flush=True)
        url = upload(f)
        
        if url:
            status["uploaded"][f.stem] = {
                "url": url,
                "size_mb": round(size_mb, 2),
                "time": datetime.now().isoformat()
            }
            with open(URLS_FILE, 'a') as fout:
                fout.write(f"{f.stem}: {url}\n")
            success += 1
            print(f"OK -> {url}")
        else:
            status["failed"].append({"id": f.stem, "reason": "upload_failed", "time": datetime.now().isoformat()})
            failed += 1
            print("FAILED")
        
        save_status(status)
        time.sleep(1)
        
        # Git commit every 10 uploads
        if i % 10 == 0:
            msg = f"cloud: uploaded {len(status['uploaded'])} videos ({len(to_upload) - i} remaining)"
            git_commit(msg)
            print(f"--- Git committed: {msg} ---")
    
    # Final commit
    msg = f"cloud: complete - {len(status['uploaded'])} uploaded, {len(status['failed'])} failed"
    git_commit(msg)
    
    print(f"\nDone! Uploaded: {success}, Failed: {failed}")
    print(f"Total on cloud: {len(status['uploaded'])}")

if __name__ == "__main__":
    main()
