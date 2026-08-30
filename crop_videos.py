#!/usr/bin/env python3
"""Crop videos: remove black bars, webcam overlay, and UI elements."""

import subprocess
import os
from pathlib import Path

DOWNLOAD_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\downloads")
CROPPED_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\cropped")
CROPPED_DIR.mkdir(exist_ok=True)


def get_video_info(video_path):
    """Get video width, height, duration."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration",
        "-of", "json",
        str(video_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    import json
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    return int(stream["width"]), int(stream["height"]), float(stream.get("duration", 0))


def detect_black_bars(video_path):
    """Detect black bar sizes using cropdetect."""
    cmd = [
        "ffmpeg", "-ss", "1", "-t", "5",
        "-i", str(video_path),
        "-vf", "cropdetect=24:16:0",
        "-f", "null", "-"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Parse cropdetect output
    crop_values = []
    for line in result.stderr.split('\n'):
        if 'crop=' in line:
            crop = line.split('crop=')[-1].strip().split(' ')[0]
            parts = crop.split(':')
            if len(parts) == 4:
                crop_values.append({
                    'w': int(parts[0]),
                    'h': int(parts[1]),
                    'x': int(parts[2]),
                    'y': int(parts[3])
                })
    
    if crop_values:
        # Use most common crop value
        return crop_values[-1]
    return None


def crop_video(video_path, output_path):
    """Crop video to remove black bars, webcam, and UI."""
    width, height, duration = get_video_info(video_path)
    
    # Crop parameters:
    # - Remove ~8% from top (level UI)
    # - Remove ~15% from bottom (webcam + taskbar)
    # - Center horizontally
    
    top_crop = int(height * 0.08)      # 8% from top
    bottom_crop = int(height * 0.15)   # 15% from bottom
    side_crop = int(width * 0.05)      # 5% from each side (black bars)
    
    new_height = height - top_crop - bottom_crop
    new_width = width - (side_crop * 2)
    
    # Ensure even dimensions
    new_width = new_width if new_width % 2 == 0 else new_width - 1
    new_height = new_height if new_height % 2 == 0 else new_height - 1
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vf", f"crop={new_width}:{new_height}:{side_crop}:{top_crop}",
        "-c:v", "libx264", "-crf", "23",
        "-c:a", "copy",
        str(output_path)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0


def main():
    print("=" * 50)
    print("Cropping Videos - Removing Bars, Webcam, UI")
    print("=" * 50)
    
    mp4_files = sorted(DOWNLOAD_DIR.glob("*.mp4"))
    print(f"Found {len(mp4_files)} videos to crop\n")
    
    success = 0
    failed = 0
    
    for i, video in enumerate(mp4_files[:10], 1):  # Test with first 10
        output = CROPPED_DIR / f"cropped_{video.name}"
        
        print(f"[{i}/10] Cropping {video.name}...", end=" ", flush=True)
        
        try:
            width, height, dur = get_video_info(video)
            print(f"({width}x{height})", end=" ", flush=True)
            
            if crop_video(video, output):
                size = output.stat().st_size / 1024 / 1024
                print(f"OK ({size:.1f}MB)")
                success += 1
            else:
                print("FAILED")
                failed += 1
        except Exception as e:
            print(f"ERROR: {e}")
            failed += 1
    
    print(f"\nDone! Success: {success}, Failed: {failed}")
    print(f"Cropped videos: {CROPPED_DIR}")


if __name__ == "__main__":
    main()
