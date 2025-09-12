# Essay & Resume Checker (Free, No Paid AI)

A tiny MVP that scores writing against a rubric using heuristics (clarity, structure, evidence, style, mechanics, originality, impact). Deploys to **Cloudflare Pages** with a single **Pages Function** for the `/analyze` endpoint.

## Quick Start
1. Download this ZIP and unzip it.
2. Create a new **GitHub** repo and upload all files.
3. In the Cloudflare dashboard → **Pages** → **Create project** → **Connect to GitHub** → select your repo.
4. Build settings:
   - Build command: *(leave empty)*
   - Output directory: `/` (root)
   - **Enable Functions** (Pages auto-detects `/functions`).
5. Click **Deploy**. Visit the URL Cloudflare gives you and paste text to analyze.

## Local Dev (optional)
If you have Node installed, you can test locally with Wrangler:
```
npm install -g wrangler
wrangler pages dev .
```
Then open the local URL it prints.

## Roadmap
- Add login & history (Neon/Postgres free tier).
- "Use my API key" toggle to call an LLM for deeper feedback.
- PDF export and shareable links.

## License
MIT
