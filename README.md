# Cartoon Creator

Turn a screenplay into an animated cartoon short — in your browser.

**Live site:** https://davidveggies.github.io/cartoon-creator/

Write dialogue, pick characters and backgrounds, click **Make Cartoon**, and watch your story play out with voice, stage movement, and scene transitions.

## How it works

1. **Write your story** — paste a screenplay or describe a story idea
2. **Build your cast** — name characters, assign images (gallery or upload), pick voices
3. **Choose a background** — pick from the asset gallery
4. **Make Cartoon** — the app compiles your script and plays the animation

## Screenplay format

Use simple `SPEAKER: line` dialogue:

```
--- Scene: The Garden ---
background: field

Narrator: Two friends meet on a sunny day.

[enter Hero inner-left]
[enter Friend inner-right]

Hero: Why are you threatening me?
Friend: Because you have a shovel.
```

**Supported stage directions:**

- `[enter Name inner-left]` / `inner-right` / `center` / `left` / `right`
- `[exit Name]`
- `[Name shakes]` / `[Name bounces]` / `[Name jumps]`

Character names in the script must match names in your cast (case-insensitive). Use `Narrator:` for narration.

## Story idea mode

Switch to **Story idea**, describe your plot in plain English, and AI converts it into a screenplay you can edit before playing.

> Requires `OPENAI_API_KEY` on a server with the `/api/generate-script` endpoint (e.g. Vercel).  
> **GitHub Pages is static** — screenplay mode works fully; story idea mode needs a separate API host.

## Features

- Browser-based cartoon player (no install for viewers)
- Character gallery + image uploads
- Auto-staging (characters enter when they first speak)
- Text-to-speech voices per character
- Scene navigation, pause/resume, video recording
- Responsive creator UI

## Local development

```bash
git clone https://github.com/davidveggies/cartoon-creator.git
cd cartoon-creator
npm install
npm run dev          # http://localhost:5173
```

For AI story idea mode locally:

```bash
export OPENAI_API_KEY=sk-...
npm run dev:api        # API on :3001 (separate terminal)
npm run dev            # Vite proxies /api → localhost:3001
```

Build:

```bash
npm run build
npm run preview
```

## Deploy

### GitHub Pages

Pushes to `main` deploy automatically via GitHub Actions (`.github/workflows/deploy-pages.yml`).

Enable in repo **Settings → Pages → Source: GitHub Actions**.

### Vercel (recommended for AI story ideas)

1. Import this repo on [Vercel](https://vercel.com)
2. Set environment variable: `OPENAI_API_KEY`
3. Deploy — static app + `/api/generate-script` serverless function

## Tech stack

- [Vite](https://vitejs.dev/) + TypeScript
- [GSAP](https://gsap.com/) for animation
- Hand-drawn SVG assets
- Browser Speech Synthesis (Web Speech API)
- Optional OpenAI for idea → screenplay conversion

## Project structure

```
src/
  creator/           # Screenplay parser, compiler, creator UI
  creator-main.ts    # App entry point
  engine/            # CartoonPlayer, audio, recording
public/assets/       # Character & background gallery
api/                 # AI script generation (Vercel/serverless)
```
