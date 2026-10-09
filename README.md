# mindfull · ท้องฟ้าในใจวันนี้ (The 2-Minute Sky)

Mobile-first 2-minute mental-health check-in for Thai office workers. Answer 6 illustrated work scenarios, meet the cloud friend visiting today (Cumulo, Nimbo, Strato or Humi), pick one way to care for yourself (now / tonight / this week), and get a right-sized next step into the consultation app. Prototype v3.1.

**Live:** https://mindfull-prototype.vercel.app

Built on the mindfull design system: colours come from its tokens, type is Prompt on its Thai scale, and the illustrations use only its palette.

## Run locally

No build step and no dependencies. Serve the `prototype/` folder:

```bash
npx serve prototype
```

Then open the printed URL. Test at 390×844 first, then desktop.

After changing the characters, rebuild the link-preview image (needs Edge or Chrome):

```bash
node scripts/build-og-image.mjs
```

## Deploy (Vercel)

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `prototype` |
| Build Command | (none) |
| Output Directory | (leave empty) |

`index.html` sets `noindex` so the prototype stays out of search results.

## Files

| Path | What |
| --- | --- |
| `prototype/index.html` | Markup and stage containers |
| `prototype/styles.css` | Semantic tokens, layout, responsive rules |
| `prototype/content.js` | All copy, scoring axes, palettes, character and scene SVGs |
| `prototype/app.js` | State, scoring, screens, micro-actions, share |
| `prototype/assets/mindfull-tokens.css` | Copy of the design-system `:root` tokens |
| `prototype/assets/mindfull-logo.svg` | mindfull wordmark (use as supplied, never recolor) |
| `prototype/og-image.png` | Link-preview image (1200×630); rebuild with `node scripts/build-og-image.mjs` |
| `docs/overview.md` | Product logic: principles, questions and their sources, results, next steps, safety, decision log |
| `docs/user-flow.md` | Screen-by-screen flow with timings |
| `docs/characters.md` | Full copy for the 4 characters |
| `CLAUDE.md` | Context for Claude Code (read first) |

## Not in this repo

The mindfull design-system sources (brand book PDFs, icon and mascot artwork, Gotham Rounded font files) belong to mindfull and stay outside this repo. Gotham Rounded is a commercial font that needs a web licence, so this build uses Prompt only.
