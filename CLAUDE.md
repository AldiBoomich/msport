# CLAUDE.md — msport theme

## Working with the user
- Talk to the user in **Russian**, simply. Everything inside the theme (code, comments, UI text, ACF labels, docs) is in **English**.
- Before deleting or overwriting anything, ask. Show what you are going to do first, then do it.
- After work, list what was done and the file paths.
- If unsure, ask instead of inventing.

## Continuing the project
- When the user says "continue" / «продолжаем» (or starts a new session on this project): first read [docs/STATUS.md](docs/STATUS.md) and [docs/ROADMAP.md](docs/ROADMAP.md), then tell the user in Russian, briefly: where we stopped, the next step, open questions. Do nothing else until they answer.
- At the end of every work block (and whenever the user says they are ending the session), update `docs/STATUS.md` and the ROADMAP checkboxes.
- Licences/copyright/brand are not a concern for this portfolio; never raise them.

## Project
- Single-page portfolio site presenting the **BMW M6 E63** (V10, 8,250 rpm).
- **Reset to zero on 2026-11-24** (user's decision): the 3D film and the old "Redline" design are gone. **No 3D, no WebGL.**
- New concept (approved 2026-11-24), after Porsche 911 Turbo S / Ferrari 812 GTS / Koenigsegg: a car-launch studio, night and day chapters alternate, 8 chapters (hero, profile, design hotspots, V10, drive, spec sheet, heritage, outro). Contract: [DESIGN.md](DESIGN.md). Fields: [docs/CONTENT-MODEL.md](docs/CONTENT-MODEL.md). Plan: [docs/ROADMAP.md](docs/ROADMAP.md). Credits: [CREDITS.md](CREDITS.md).
- **Signature = the sound of the V10**: the engine photo with a sound button (the POWER key and the tachometer were removed on 2026-11-25 at the user's request: "does not fit the design"). Amber `--c-amber` is used only for the engine sound, never on day chapters.
- Photos: coupé shots from Wikimedia Commons cut out onto our studio backdrop; details, cockpit, engine from official BMW press photos (M6 Convertible 06/2006 set, roof never visible); M635CSi for heritage. User's choice 2026-11-24.
- Font: Mona Sans variable (width axis: wide caps headlines, condensed figures), self-hosted woff2.
- E63 reference photos: `C:\Users\aaldi\Local Sites\msport\refs-e63\` — never delete. Press/source photos: `C:\Users\aaldi\Local Sites\msport\press-m6\`. Python tools venv: `C:\Users\aaldi\Local Sites\msport\.venv`.
- Build and check with the `wp-premium-design` skill (mode **build**).
- Local site: Local (Flywheel), site folder `C:\Users\aaldi\Local Sites\msport`. URL: `http://msport.local/`. Runs PHP 8.5.1. No WP-CLI in PATH.

## Stack
- Classic PHP theme (started from `_s`). Text domain and prefix: `msport` / `msport_`. Version constant `MSPORT_VERSION` in `functions.php`; code split into `inc/` (setup, cleanup, assets, helpers). Templates read fields through `msport_field()` / `msport_option()` / `msport_front()` (fallback when the plugin is off or a field is empty).
- **ACF PRO** (installed). Field groups go to `acf-json/` (Local JSON). Never rename a field that has content.
- All assets self-hosted in the theme. No CDNs, no Google Fonts. No jQuery on the front end. No page builders. No form on the site.
- Motion: native scroll (no GSAP, no Lenis — none of the references uses them), `position: sticky` scenes scrubbed by a small own module, vanilla ES modules, JS ≤ 25 KB on the front page.
- PHP linting: `composer` is not in PATH; run `"C:/Users/aaldi/AppData/Roaming/Local/lightning-services/php-8.5.1+1/bin/win64/php.exe" vendor/bin/phpcs`.

## Rules
- Nothing visible is hardcoded in templates: text and images come from ACF, the menu or the Customizer. Fallback strings use `esc_html__( '…', 'msport' )`.
- Escape on output: `esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`. Sanitize all input, check nonces.
- Tokens only from DESIGN.md (`:root`); no new colours, sizes or radii outside it.
- Images: AI-generated studio shots from Gemini are allowed (user's decision 2026-11-25, replacing the earlier "no AI images" rule); prompts in `C:\Users\aaldi\Local Sites\msport\press-m6\gemini\PROMPTS.md`.
- Every animation has a `prefers-reduced-motion` version; nothing stays hidden without JS.
- One `<h1>`. No horizontal scroll 360–1920 px. AA contrast. Full keyboard support.
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
