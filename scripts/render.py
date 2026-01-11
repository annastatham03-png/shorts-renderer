import os
import re
import json
import time
import random
import string
import subprocess
from pathlib import Path

import requests

# ---------- Helpers ----------
def env(name: str, default: str = "") -> str:
    v = os.getenv(name)
    return v if v is not None and v != "" else default

def safe_filename(s: str, max_len: int = 80) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"[^a-zA-Z0-9 _-]", "", s)
    return s[:max_len].strip() or "short"

def run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(p.stdout)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")

def pick_provider(provider: str) -> str:
    p = (provider or "BOTH").upper().strip()
    if p in ("PEXELS", "PIXABAY"):
        return p
    return random.choice(["PEXELS", "PIXABAY"])

# ---------- Media Fetch ----------
def download_file(url: str, out_path: Path, headers: dict | None = None) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, headers=headers or {}, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 256):
                if chunk:
                    f.write(chunk)

def fetch_pexels_video(query: str, api_key: str) -> str:
    if not api_key:
        raise RuntimeError("PEXELS_API_KEY is missing in GitHub Secrets.")
    url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": api_key}
    params = {"query": query, "per_page": 10, "orientation": "portrait"}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    videos = data.get("videos", [])
    if not videos:
        raise RuntimeError("No Pexels videos found for query.")
    # pick best (portrait) file
    candidates = []
    for v in videos:
        for f in v.get("video_files", []):
            if f.get("link") and (f.get("width", 0) <= f.get("height", 1)):  # portrait-ish
                candidates.append(f["link"])
    if not candidates:
        # fallback any file
        for v in videos:
            for f in v.get("video_files", []):
                if f.get("link"):
                    candidates.append(f["link"])
    if not candidates:
        raise RuntimeError("No downloadable Pexels video link found.")
    return random.choice(candidates)

def fetch_pixabay_video(query: str, api_key: str) -> str:
    if not api_key:
        raise RuntimeError("PIXABAY_API_KEY is missing in GitHub Secrets.")
    url = "https://pixabay.com/api/videos/"
    params = {"key": api_key, "q": query, "per_page": 10}
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    hits = data.get("hits", [])
    if not hits:
        raise RuntimeError("No Pixabay videos found for query.")
    # choose medium/large
    candidates = []
    for h in hits:
        vids = h.get("videos", {})
        for k in ("large", "medium", "small", "tiny"):
            if k in vids and vids[k].get("url"):
                candidates.append(vids[k]["url"])
                break
    if not candidates:
        raise RuntimeError("No downloadable Pixabay video url found.")
    return random.choice(candidates)

# ---------- TTS ----------
def tts_edge(text: str, voice: str, out_wav: Path) -> None:
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    # edge-tts CLI is installed via requirements.txt
    run(["edge-tts", "--voice", voice, "--text", text, "--write-media", str(out_wav)])

# ---------- Render ----------
def main():
    job_id = env("JOB_ID", f"job_{int(time.time())}")
    topic = env("TOPIC", "trend")
    script = env("SCRIPT", "")
    provider_pref = env("PROVIDER", "BOTH")
    voice = env("VOICE", "en-US-AriaNeural")

    pexels_key = env("PEXELS_API_KEY", "")
    pixabay_key = env("PIXABAY_API_KEY", "")

    if not script.strip():
        raise RuntimeError("SCRIPT is empty. Pass script input from n8n.")

    out_dir = Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1) TTS
    audio_wav = out_dir / "voice.wav"
    print(f"[TTS] voice={voice}")
    tts_edge(script, voice, audio_wav)

    # 2) Fetch background video
    query = safe_filename(topic, 60)
    chosen = pick_provider(provider_pref)
    print(f"[VIDEO] provider={chosen} query={query}")

    video_url = ""
    if chosen == "PEXELS":
        video_url = fetch_pexels_video(query, pexels_key)
    else:
        video_url = fetch_pixabay_video(query, pixabay_key)

    bg_mp4 = out_dir / "bg.mp4"
    print(f"[DOWNLOAD] {video_url}")
    # Pexels needs Authorization only for API, not for download link. Pixabay is direct too.
    download_file(video_url, bg_mp4)

    # 3) Build final mp4 (9:16, 1080x1920, audio overlay)
    final_mp4 = out_dir / "final.mp4"

    # We:
    # - scale/crop to 1080x1920
    # - ensure duration matches audio (shortest)
    # - add slight volume normalization (optional)
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", str(bg_mp4),
        "-i", str(audio_wav),
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        str(final_mp4),
    ]
    print("[FFMPEG] rendering out/final.mp4")
    run(ffmpeg_cmd)

    if not final_mp4.exists() or final_mp4.stat().st_size < 10000:
        raise RuntimeError("final.mp4 not created or too small.")

    print("✅ DONE")
    print(json.dumps({
        "job_id": job_id,
        "topic": topic,
        "provider": chosen,
        "voice": voice,
        "output": str(final_mp4),
    }, indent=2))

if __name__ == "__main__":
    main()

