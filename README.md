# shorts-renderer

GitHub Actions based renderer for YouTube Shorts.

## Inputs (workflow_dispatch)
- job_id
- topic
- script
- provider: PEXELS | PIXABAY | BOTH
- voice: EdgeTTS voice (default: en-US-AriaNeural)

## Required Secrets
Add these in: Repo Settings → Secrets and variables → Actions → New repository secret

- PEXELS_API_KEY
- PIXABAY_API_KEY

## Output
Action uploads an artifact:
- rendered-<job_id>
containing:
- out/final.mp4
