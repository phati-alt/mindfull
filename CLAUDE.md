# CLAUDE.md — mindfull · ท้องฟ้าในใจวันนี้ (The 2-Minute Sky)

Context for Claude Code. Read this first, then `docs/overview.md`.

This folder (`mindfull/`, its own git repo) holds one feature for the **mindfull** project. It sits next to the design-system sources in the parent folder, which are **not** part of this repo.

## Design system

The mindfull project has its own design system in the parent folder (`../mindfull-design-system/`). **That design system is the source of truth.** Before changing any colour, font, spacing or component here:

1. Find the design system in the project (tokens, components, fonts) and read it.
2. Map the CSS variables in `prototype/styles.css` (`:root`) to the design system tokens instead of hard-coding new values.
3. If the prototype needs something the design system lacks, propose it to the human first; don't invent new tokens silently.

The token variables are copied into `prototype/assets/mindfull-tokens.css` (`:root` only) so the site deploys on its own. When the design system changes, re-copy that block; never edit the copy by hand.

## What this project is

A prototype for mindfull, a Thai online psychologist-consultation app: a digital experience a user completes in about 2 minutes and walks away with something meaningful (insight, reflection, or an appropriate next step).

The experience: a mobile-first web experience where Thai office workers answer 6 short illustrated work-life scenario questions, then meet the cloud friend visiting today (one of 4 characters, revealed only at the end). The result card gives a short insight, lets them pick one way to care for themselves (a 20-second micro-action now, or a plan for tonight / this week), then a right-sized next step that can lead into the existing consultation app.

- Primary persona: **แพร**, 28, agency Account Executive in Bangkok, tired but "not bad enough" to see a psychologist.
- Favour small, safe, shippable changes.
- The human owns design decisions. Propose, don't silently change copy or logic. Log real decisions in the decision log (`docs/overview.md`, last section).

## Repo map

```
CLAUDE.md                 ← you are here
README.md
.gitignore
docs/
  overview.md             ← problem, principles, scoring, questions + sources, results, next-step matrix, safety, decision log
  user-flow.md            ← flowchart + per-screen table with timings
  characters.md           ← full copy for the 4 characters
prototype/
  index.html              ← markup + stage containers
  styles.css              ← tokens (light only), layout, responsive rules
  content.js              ← ALL copy, scoring axes, palettes, character + scene SVGs (plain globals)
  app.js                  ← state, scoring, screens, micro-actions, share
  favicon.svg
  assets/
    mindfull-tokens.css   ← copy of the design-system :root tokens
    mindfull-logo.svg     ← mindfull wordmark (use as supplied)
```

Persona, journey map and checklist live outside this repo; they are not needed for code work.

## Run

No build step. The prototype is self-contained (no `../` references), so serve the `prototype/` folder:

```bash
npx serve prototype      # or: python3 -m http.server -d prototype 8000
```

Test at 390×844 (iPhone 14) first, then desktop. Light mode only (no dark theme, by design decision). Check `prefers-reduced-motion`.

## How the prototype works (v3.1)

- **Screens:** `landing → question (×6) → reveal → care (optional) → micro (optional) → next` (+ share overlay). `setScreen(name)` clears timers, calls `showChar()` and `render()`; each screen is a function returning an HTML string into `#content`. Clicks are delegated via `data-act`.
- **Question sources:** each scenario is mapped to a construct from a validated scale (WHO-5, PSS, BAT, REQ; table in `docs/overview.md`). Claim "informed by", never "validated". The sources are documented in the docs only; the landing no longer shows a "คำถามมาจากไหน" disclosure.
- **Landing:** `buildParade()` fills `#parade` with the 4 characters standing still in one row (no walking animation, by design decision in v3.0.1).
- **Questions:** `SCENES[S.i]` (inline SVG per question, neutral white cloud-head worker) is injected into `#scene` on each question. The sky stays neutral; **no hint of the result while answering**.
- **Scoring:** each answer is `storm | rain | fog | fluffy`, mapped in `AXES` to energy/pressure (±1). Result = sign of summed axes over Q1–5 (odd count, no ties). Q6 (self-contained duration question, 4 options incl. "ไม่ค่อยรู้สึกแบบนั้น" = 0) sets `S.duration` (0, 1, 2) for the next step only. Its hint `.durhint` hides below 740px height.
- **Characters:** `storm`=Cumulo, `rain`=Nimbo, `fog`=Strato, `fluffy`=Humi. Copy lives in `CHAR`, `ABOUT`, `CARD`, `CARE`, `RESULTS` (reframe, micro titles) in `content.js`; SVGs in `CHAR_SVG`. Full spec: `docs/characters.md`.
- **Reveal:** the character appears (`showChar(k)`), then the Meet-Your-Cloud card: header → รู้จัก → พลังพิเศษ → จุดเด่น | เมื่อพลังล้น → How to ดูแล section (label, 2-line description, primary CTA "เลือกวิธีดูแล [name]" → `to-care`) → reframe → เพื่อนซี้ → actions: ghost "ส่งการ์ด…", link "ไปที่ก้าวต่อไป".
- **How to ดูแล (own screen, `care()`):** reached from the CTA inside the reveal card's How to ดูแล section; "ย้อนกลับ" returns to the card (`to-reveal`), "ไปที่ก้าวต่อไป" skips. 3 `role=radio` options (`CARE[k][0..2]`, `WHEN` labels). `S.carePick` 0 → "เริ่มเลย 20 วินาที" to the micro screen; 1/2 → commitment note + primary "ไปที่ก้าวต่อไป" + ghost "ตั้งเตือนในแอป" (toast). The pick is shown at the top of the next-step screen.
- **Micro-actions:** Cumulo breathing (character scales via `#charWrap.inhale/.exhale`), Nimbo let-go text, Strato 3-2-1 grounding (fog overlay `#charFog` clears per step), Humi note to self (`localStorage` key `sky-note`).
- **Share card:** character, "วันนี้ [ชื่อ] มาเยือนฉัน", title + power, รู้ไหม fact. No answers.
- **Mobile:** visuals sized by `dvh` so question + 4 options fit on iPhone SE; landscape phones switch to picture-left/content-right; 44px+ tap targets incl. the 1323 link; safe-area padding.
- **Timing:** there is no on-screen timer or version badge (removed for the public build); time usability sessions with a stopwatch.

## Non-negotiables (from the design principles)

1. **State, not label.** Results describe today ("มาเยือน"), never a fixed identity. No clinical words (ซึมเศร้า, วิตกกังวล, โรค, อาการ, วินิจฉัย except in the disclaimer).
2. **Give before ask.** Insight and micro-action come before any CTA. No sign-up wall. No pricing or booking UI inside this experience.
3. **Right-sized next step.** Only long-lasting (duration 2) storm/rain/fog suggest a psychologist, in inviting language, never fear-based.
4. **2-minute budget.** Landing 0:15, Q1–5 to 0:50, Q6 to 1:00, reveal to 1:30, micro 1:30–1:50, next step to 2:00. Any added screen or step must fit this or be optional/skippable.
5. **Safety always visible.** The 1323 mental-health hotline link stays on every screen. Don't remove it.
6. **Privacy.** Don't store or send answers. Share image shows only the cloud and its name.
7. **Thai first.** All UI copy is Thai, conversational, sentence case. Font: Prompt (Google Fonts) with Noto Sans Thai / Leelawadee UI / Thonburi fallbacks.
8. **Accessibility floor.** Visible focus, 44px min tap targets (48px+ for answer options), `aria-live` content region, focus moved to each screen heading, reduced motion respected.

## Design tokens (current)

- Bound to the design-system tokens (`prototype/assets/mindfull-tokens.css`) via `var(--token, fallback)`, following its usage rules (`../mindfull-design-system/project/README.md`): ink `black`, ink-soft `turquoise-gray-1`, surface `white`, line `black-gray-1` (dividers and container borders only), control-line `bluegray-400` (outline of answer/care options and the text field, 3.3:1; the DS has no control-outline token and says black-gray-1 is too faint for controls), accent `blue-1` (active `blue-3`), focus `blue-700` 2px/2px that follows each element's own corners (headings focused by script show no ring), brand `turquoise-1` (decoration only, never small text), selected `turquoise-2`, panels `turquoise-3`, error `flamingo-1/2`, highlight `marigo-1`. Light mode only: no dark theme (`color-scheme: light`).
- Type is **Prompt only**, on the `th-*` scale (Light 300 body, Medium 500, SemiBold 600; fixed px line heights: Body 1 16/20, Body 3 14/24). Gotham Rounded, the design system's English face, is a commercial Hoefler & Frere-Jones font that needs a web licence, so it is not shipped or committed (`.gitignore` blocks font files). English-only text keeps the `en-*` sizes with Prompt weights (Book → 300, Medium → 500, Bold → 600). Only weights 300/500/600 are loaded. The breathing counter uses `th-h1` (36/40), the largest style in the scale. Buttons are 40px pills as specified; `.btn::after` extends the hit area to 48px for the tap-target floor.
- Spacing uses a **proposed** 4px scale (`--space-4` … `--space-48`: 4, 8, 12, 16, 20, 24, 32, 40, 48) defined in `styles.css` `:root`; the design system has no spacing tokens yet. Every padding, margin and gap uses it; don't add raw px spacing. Figma copy: `../mindfull-design-system/exports/figma/mindfull-spacing.figma.json`.
- Page background is `gray-50`; the sheet and share card are white cards with `radius-24`, a 16px margin (never edge to edge) and turquoise elevation (`elevation-03`, share card `elevation-08`). The result is no longer shown as a page-wide sky colour.
- Illustrations (`CHAR_SVG`, `SCENES`, `PALETTE` in `content.js`, inline SVG in `app.js` / `index.html`) use only palette colours. The palette has no browns, so desks are `gray-400` / `gray-600`. `PALETTE.sky` (neutral `blue-50`, storm `bluegray-400`, rain `bluegray-200`, fog `gray-300`, fluffy `blue-100`) now only colours the share-card picture and the buddy avatar.
- The mindfull wordmark (`LOGO_SRC` in `content.js`, file `prototype/assets/mindfull-logo.svg`) sits at the top of the landing sheet and the share card. Use it as supplied, on white; never recolor.
- Layout: single column, max-width 460px; character/scene stage on top, white card below. Stage shrinks on question screens (`.app.compact`).
- The one bold element is the cloud character. Keep everything else quiet. Avoid generic template chrome (all-caps eyebrows, arrows on buttons, card-shadow kits).

## Known limitations (v3.1)

- Characters are concept-level SVG drawings, not final illustrations.
- Buttons that would open the real app (remind, journal, psychologist) only show a toast.
- Share uses `navigator.share` text or clipboard; no image export yet.
- Result page reads in ~50s; total may exceed 2 minutes — needs real timing tests.
- No analytics; success metrics are defined in docs but not instrumented.

## Likely next tasks

1. **Swap in final character illustrations** (keep `CHAR_SVG` keys Cumulo/Nimbo/Strato/Humi; landing row, reveal and share card reuse them).
2. **Apply usability-test fixes** (timing, unclear questions, copy). Re-check the 2-minute budget after any change.
3. **Deploy** on Vercel: Framework Preset "Other", Root Directory `prototype`, no build command. Keep it a static, dependency-free site unless asked otherwise. `noindex` is set in `index.html` while it is a prototype.
4. **Share image** (optional): render the share card to PNG via canvas so it can be posted to IG Story.
5. **Keep docs in sync:** if copy or logic changes in `content.js`, update `docs/overview.md`, (and `user-flow.md` / `characters.md` if screens or character copy changed).

## Style for code changes

- Vanilla HTML/CSS/JS, no framework, no build. ES5-style `var` in the existing files; keep consistent.
- Question, result and next-step copy lives in `content.js`. Screen chrome (landing text, button labels, micro-action UI strings) is currently inline in the screen functions in `app.js`; moving it into `content.js` is a fine cleanup if asked.
- Small commits with clear messages. Verify on a 390px-wide viewport after every change.
