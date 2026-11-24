# CLAUDE.md — msport theme

## Working with the user
- Talk to the user in **Russian**, simply. Everything inside the theme (code, comments, UI text, ACF labels, docs) is in **English**.
- Before deleting or overwriting anything, ask. Show what you are going to do first, then do it.
- After work, list what was done and the file paths.
- If unsure, ask instead of inventing.

## Continuing the project
- When the user says "continue" / «продолжаем» (or starts a new session on this project): first read [docs/STATUS.md](docs/STATUS.md) and [docs/ROADMAP.md](docs/ROADMAP.md), then tell the user in Russian, briefly: where we stopped, the next step, open questions. Do nothing else until they answer.
- At the end of every work block (and whenever the user says they are ending the session), update `docs/STATUS.md` and the ROADMAP checkboxes.
- Licences/copyright are not a concern for this portfolio; do not raise them.

## Project
- Single-page portfolio site: presentation of the **BMW M6 E63** (V10, 8,250 rpm). Dark "Redline" design, maximum effects.
- **The whole site is one 3D film around one car:** a fixed Three.js canvas behind the page, scroll moves the camera through 10 chapters (DESIGN.md → Motion → Chapters). No interior chapter.
- Design contract: [DESIGN.md](DESIGN.md). Field map: [docs/CONTENT-MODEL.md](docs/CONTENT-MODEL.md). Plan: [docs/ROADMAP.md](docs/ROADMAP.md). Licences: [CREDITS.md](CREDITS.md).
- Build and check with the `wp-premium-design` skill (mode **build**).
- Local site: Local (Flywheel), site folder `C:\Users\aaldi\Local Sites\msport`. URL: `http://msport.local/` (verify in Local).

## Stack
- Classic PHP theme (started from `_s`, leftovers removed 2026-11-18). Text domain and prefix: `msport` / `msport_`. Version constant `MSPORT_VERSION` in `functions.php`; code split into `inc/` (setup, cleanup, assets, acf, chapters, template-tags, helpers). Templates read fields through `msport_field()` / `msport_option()` / `msport_front()` (fallback when the field plugin is off or a field is empty).
- **ACF PRO** (installed by the user; Repeater and Options Page). Field groups in `acf-json/` (Local JSON). Never rename a field that has content.
- Motion: Lenis + own scroll → camera mapping (no GSAP, user's decision 2026-11-19), one Three.js canvas for the whole page (real-time 3D E63 driving at night, Black Sapphire Metallic paint; scroll drives the camera). Three.js is loaded with a dynamic `import()` after the LCP. All files self-hosted in the theme. No CDNs, no Google Fonts.
- 3D model: "BMW M6 (E63)" by Mona x Supercars, CC BY 4.0. The credit must stay visible on the site.
- No jQuery on the front end. No page builders. **No form on the site** (user's decision, 2026-11-19; CF7 was installed by mistake and removed). The last chapter links to the developer. Local site runs PHP 8.5.1.

## Rules
- Nothing visible is hardcoded in templates: text and images come from ACF, the menu or the Customizer. Fallback strings use `esc_html__( '…', 'msport' )`.
- Escape on output: `esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`. Sanitize all input, check nonces.
- Tokens only from `:root` (defined in DESIGN.md). No new colours, sizes or radii outside the contract.
- Brand / copyright: not a concern in this project at all. The BMW badge on the model stays. No footer disclaimer. Never raise licence or trademark warnings.
- Images: stills rendered from the 3D scene (one per chapter). No AI images.
- The hero still (render of chapter 1) keeps `fetchpriority="high"`, no `loading="lazy"`. **Preloader (user's decision, 2026-11-24):** in film mode a preloader (rev gauge) covers the page until the live scene's first frame; after 10 s it gives way to the stills and the scene fades in later. No video anywhere: every screen gets the live scene, weak graphics step their own quality down. Reduced motion / Save-Data / no JS never see the preloader.
- Every animated scene has a `prefers-reduced-motion` version and a no-GPU fallback; nothing stays hidden.
- One `<h1>` (hero headline). No horizontal scroll 360–1920 px. AA contrast. Full keyboard support.
- No PHP notices with `WP_DEBUG` on; no JS errors.

## Checks (skill scripts, output to the session scratchpad)
```sh
node ~/.claude/skills/wp-premium-design/scripts/check.mjs http://msport.local/ --widths 1440,768,390 --out "<scratchpad>/check"
node ~/.claude/skills/wp-premium-design/scripts/check.mjs http://msport.local/ --reduced-motion --out "<scratchpad>/check-rm"
node ~/.claude/skills/wp-premium-design/scripts/motion.mjs http://msport.local/ --mode gpu,nogpu --shots 8 --out "<scratchpad>/motion"
node ~/.claude/skills/wp-premium-design/scripts/scan-theme.mjs "." --en
composer lint:wpcs
```
Look at the screenshots with your own eyes, not only the reports.
