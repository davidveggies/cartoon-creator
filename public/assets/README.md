# Drop your assets here

## folders

- `characters/` — character PNGs or SVGs (transparent background works best)
- `story/` — **storybook photos and illustrations** (auto-included in the narrative)
- `backgrounds/` — scene backgrounds (1920×1080 or similar 16:9)
- `props/` — objects, effects, overlays
- `audio/` — background music (`happy-dance.mp3` for the finale dance scene)

## story images (automatic)

Drop JPG, PNG, WebP, GIF, or SVG files into `story/`. They are picked up automatically — no code changes needed.

- Files play in **filename order** (use numeric prefixes like `01-`, `02-` to control sequence)
- Optional captions come from the filename: `01-from-the-notebook.jpg` → caption "From The Notebook"
- Images appear as full-screen panels at the start of the cartoon, before the title scene
- During dev, adding or removing files refreshes the player automatically

## naming

Use clear names: `kitten-happy.png`, `garden-day.jpg`, `03-nora-arrives.png`, etc.
