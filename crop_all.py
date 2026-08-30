#!/usr/bin/env python3
"""Crop ALL videos - remove black bars, webcam overlay, and UI elements."""

import subprocess
import json
from pathlib import Path

DOWNLOAD_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\downloads")
CROPPED_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\cropped")
CROPPED_DIR.mkdir(exist_ok=True)


def get_video_info(video_path):
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0",
           "-show_entries", "stream=width,height", "-of", "json", str(video_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    s = data["streams"][0]
    return int(s["width"]), int(s["height"])


def crop_video(video_path, output_path):
    width, height = get_video_info(video_path)
    top = int(height * 0.08)
    bottom = int(height * 0.15)
    sides = int(width * 0.05)
    nw = width - (sides * 2)
    nh = height - top - bottom
    nw = nw if nw % 2 == 0 else nw - 1
    nh = nh if nh % 2 == 0 else nh - 1
    
    cmd = ["ffmpeg", "-y", "-i", str(video_path),
           "-vf", f"crop={nw}:{nh}:{sides}:{top}",
           "-c:v", "libx264", "-crf", "23", "-c:a", "copy",
           str(output_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0


def main():
    mp4_files = sorted(DOWNLOAD_DIR.glob("*.mp4"))
    already_cropped = {f.name.replace("cropped_", "") for f in CROPPED_DIR.glob("*.mp4")}
    
    to_crop = [f for f in mp4_files if f.name not in already_cropped]
    print(f"Total: {len(mp4_files)}, Already cropped: {len(already_cropped)}, Remaining: {len(to_crop)}")
    
    success = 0
    for i, video in enumerate(to_crop, 1):
        output = CROPPED_DIR / f"cropped_{video.name}"
        if crop_video(video, output):
            success += 1
        if i % 50 == 0:
            print(f"  Progress: {i}/{len(to_crop)} cropped")
    
    print(f"\nDone! Cropped {success}/{len(to_crop)} videos")


if __name__ == "__main__":
    main()
