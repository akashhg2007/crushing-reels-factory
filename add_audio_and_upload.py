#!/usr/bin/env python3
"""
Add background audio to videos and upload test to YouTube.
Usage: python add_audio_and_upload.py
"""

import os
import subprocess
import sys
from pathlib import Path

DOWNLOAD_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\downloads")
OUTPUT_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\output")
AUDIO_DIR = Path(r"C:\Users\admin\OneDrive\Documents\crushing-reels-factory\audio")

# Create directories
OUTPUT_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)


def generate_silent_audio(duration, output_path):
    """Generate a silent audio file (for testing)."""
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
        "-t", str(duration),
        "-c:a", "aac", "-b:a", "128k",
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True)


def generate_tone_audio(duration, freq=440, output_path=None):
    """Generate a simple tone audio (for testing)."""
    if output_path is None:
        output_path = AUDIO_DIR / "tone.aac"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency={freq}:duration={duration}",
        "-c:a", "aac", "-b:a", "128k",
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True)
    return output_path


def get_video_duration(video_path):
    """Get video duration in seconds."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except:
        return 30  # default


def add_audio_to_video(video_path, audio_path, output_path):
    """Mix audio with video."""
    duration = get_video_duration(video_path)
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-filter_complex",
        f"[1:a]atrim=0:{duration},asetpts=PTS-STARTPTS,volume=0.3[bg];[0:a][bg]amix=inputs=2:duration=first[out]",
        "-map", "0:v", "-map", "[out]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        str(output_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0


def main():
    print("=" * 50)
    print("Add Audio to Videos & Upload Test")
    print("=" * 50)
    
    # Get first video
    mp4_files = sorted(DOWNLOAD_DIR.glob("*.mp4"))
    if not mp4_files:
        print("No MP4 files found in downloads/")
        return
    
    test_video = mp4_files[0]
    print(f"\nTest video: {test_video.name}")
    print(f"Size: {test_video.stat().st_size / 1024 / 1024:.2f} MB")
    
    # Get duration
    duration = get_video_duration(test_video)
    print(f"Duration: {duration:.1f} seconds")
    
    # Generate background tone (440Hz for 5 seconds)
    print("\nGenerating background audio...")
    tone_path = generate_tone_audio(5, 440)
    print(f"Audio generated: {tone_path}")
    
    # Add audio to video
    output_file = OUTPUT_DIR / f"audio_{test_video.name}"
    print(f"\nAdding audio to video...")
    
    success = add_audio_to_video(test_video, tone_path, output_file)
    
    if success and output_file.exists():
        print(f"Success! Output: {output_file}")
        print(f"Output size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
    else:
        print("Failed to add audio")
        return
    
    print("\n" + "=" * 50)
    print("To upload to YouTube, you need to:")
    print("1. Set up YouTube API credentials in .env file")
    print("2. Run: npm run auth")
    print("3. Run: npm run upload:existing")
    print("=" * 50)


if __name__ == "__main__":
    main()
