import os
import json
import time
import requests
from pathlib import Path

DOWNLOAD_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\downloads")
URLS_FILE = DOWNLOAD_DIR / "upload_urls.txt"
CATBOX_URL = "https://catbox.moe/user/api.php"
MAX_SIZE = 200 * 1024 * 1024

def load_existing():
    ids = set()
    if URLS_FILE.exists():
        for line in URLS_FILE.read_text().split('\n'):
            if ': ' in line:
                ids.add(line.split(': ')[0].strip())
    return ids

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
    existing = load_existing()
    mp4_files = sorted(DOWNLOAD_DIR.glob("*.mp4"))
    to_upload = [f for f in mp4_files if f.stem not in existing]
    
    print(f"Total: {len(mp4_files)}, On cloud: {len(existing)}, To upload: {len(to_upload)}")
    
    success = 0
    failed = 0
    
    for i, f in enumerate(to_upload, 1):
        size_mb = f.stat().st_size / (1024 * 1024)
        
        if f.stat().st_size > MAX_SIZE:
            print(f"[{i}/{len(to_upload)}] SKIP {f.stem} ({size_mb:.1f}MB > 200MB)")
            failed += 1
            continue
        
        print(f"[{i}/{len(to_upload)}] {f.stem} ({size_mb:.1f}MB)...", end=" ", flush=True)
        url = upload(f)
        
        if url:
            with open(URLS_FILE, 'a') as fout:
                fout.write(f"{f.stem}: {url}\n")
            success += 1
            print(f"OK")
        else:
            failed += 1
            print("FAILED")
        
        time.sleep(1)
        
        if i % 25 == 0:
            print(f"--- Progress: {success} uploaded, {failed} failed ---")
    
    print(f"\nDone! Uploaded: {success}, Failed: {failed}")
    print(f"Total on cloud: {len(existing) + success}")

if __name__ == "__main__":
    main()
