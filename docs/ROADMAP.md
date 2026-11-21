# Roadmap

## 0. Documents
- [x] DESIGN.md (direction "Redline", dark)
- [x] docs/CONTENT-MODEL.md
- [x] CREDITS.md, README.md, CLAUDE.md
- [x] Concept: the whole site is one 3D film around one car, 10 chapters (DESIGN.md → Motion → Chapters)
- [x] Client approves DESIGN.md (2026-11-18)

## 1. Assets
- [x] V10 recording (≤ 15 s): `assets/audio/m6-v10.mp3`, built by `tools/audio/process-v10.sh`
- [x] Unused source models removed from the theme (`csmx` deleted, `mona` source moved to `Local Sites/msport/3d-source/`)
- [x] Archivo variable woff2, subset Latin + Latin Ext (`assets/fonts/archivo-var.woff2`, 163 KB)
- [x] Download "BMW M6 (E63)" by Mona x Supercars from Sketchfab
- [x] Prepare the model: back faces removed, smoothed, wheels split, Meshopt + WebP → `assets/3d/m6-e63.glb` (2.2 MB)
- [x] Black Sapphire paint tuned (in the test viewer)
- [x] Night HDRI and asphalt texture (CC0, Poly Haven)
- [ ] Mobile LOD ≤ 1.5 MB (decimate interior and underbody)
- [ ] Every asset listed in CREDITS.md

## 2. 3D: camera angles and chapter stills
- [x] Camera keys for the 10 chapters in `tools/3d/chapters.js`, test shots, approved by the user (2026-11-18)
- [x] Seamless camera rail through all chapters: `tools/3d/camera-path.js` (Catmull-Rom + smootherstep, via points, clearance checked), fly-through preview `tools/3d/film.mjs` → `assets/3d/previews/film-*.mp4` — waiting for the user's review
- [x] Carbon roof material (the model's roof is plain paint): procedural 2x2 twill on the roof panel, under the clear coat
- [x] Light pass: exposure 1.35, stronger rim + narrow cool spot on the car, headlight lenses made clear, lamp glow with bloom (HDR cap against glints), background compensated to stay exactly #14171B
- [x] User reviewed the first fly-through: "the car looks plastic, low detail" → realism pass (2026-11-18)
- [x] Wheels: procedural tread + sidewall lettering, real drilled vented discs + calipers, painted alloy rims (`tools/3d/wheel-detail.js`)
- [x] Baked AO per vertex + ground contact shadow (`tools/3d/bl_bake_ao.py` → `assets/3d/m6-e63-v2.glb`, `assets/3d/textures/car-shadow.png`), applied to indirect light only (`tools/3d/car-shading.js`)
- [x] Real shadow maps from the spot lights, red tail-lamp lenses, darker interior / frit, GPU + 2x supersampled previews
- [x] User reviewed v2: "still plastic" → photoreal paint pass: 4K night HDRI + lightformers in a 1024 px cube (`tools/3d/car-env.js`), old direct lights off, two-layer flake paint + normal smoothing (`tools/3d/car-shading.js`)
- [ ] User reviews v3 (`film-*-v3.mp4`, `before-after-v3-*.png`); replace `m6-e63.glb` with v2 (ask first)
- [x] Site copy of the HDRI: packed 4K / 2K WebP pairs (2026-11-19)
- [x] Realism v5 (photoreal-3d skill): sharp dim city backdrop, damp road with puddles, less gold on the flanks, grain + vignette, headlight eyebrow fix, real chrome value (2026-11-18)
- [x] User reviewed v5: "a toy: you over-smoothed it, a car has sharp body lines" → model v3: design lines creased and kept, panels faired, grille slats, angel eyes, deep red tail lamps (`assets/3d/m6-e63-v3.glb`, `before-after-v6-*.png`) (2026-11-18)
- [x] User approved model v3: main model from now on; old models stay for comparison (2026-11-18)
- [x] Re-render fly-through and sheets with v3 (`film-*-v4.mp4`, `chapters-*-v5.png`, on the RTX 4050) (2026-11-18)
- [ ] User reviews the v3 fly-through
- [ ] User reviews realism v5 (`assets/3d/previews/realism-v5-*.png`)
- [ ] Orange peel (made, off: reads as ripple on this geometry)
- [ ] Close-up quality check: headlights, gills, rims and brake discs, exhaust tips, roof
- [x] Per-chapter effects prototyped in the viewer: headlights on, light bar sweep, disc glow, heat haze, limiter jolt, gear jolts, roof highlight, dims + driving loop (road, wheels with spin blur, street lamps) — `tools/3d/chapter-fx.js`, `film-*-fx1.mp4` (2026-11-18)
- [x] New backdrop: Shanghai Bund HDRI turned to 180° (Pudong skyline, no trees), chosen from 5 HDRIs (`bg-*.png`), re-rendered `chapters-*-v6.png`, `film-*-fx2.mp4` (2026-11-18)
- [x] User reviewed the effects (`film-*-fx2.mp4`): OK for now, final judgement on the real site (2026-11-18)
- [x] Render chapter stills (16:9 2560×1440 + portrait 9:19.5 1200×2600) for chapters 1–8 and 10, WebP q82, in the media library and the fields (2026-11-19)

## 3. Theme skeleton
- [x] Clean `_s` leftovers: 20 files deleted with the user's OK (blog templates, sidebar, comments, custom header, Jetpack, customizer, RTL, old JS) (2026-11-18)
- [x] `style.css` header, `MSPORT_VERSION`, text domain `msport`, `inc/` split, screenshot.png from the chapter 1 render
- [x] `:root` tokens from DESIGN.md, base typography, local fonts with metric fallback (`assets/css/main.css`)
- [x] Header, footer, skip link, mobile menu (`assets/js/header.js`: focus trap, Esc, inert page)
- [x] Image sizes, `defer` scripts, no jQuery on the front end, emoji / comments / feeds / block CSS on the front page removed
- [x] Front page skeleton: 10 chapter sections from `inc/chapters.php`, hero template, generic chapter template; 404 "You hit the limiter"; default page

## 4. ACF (ACF PRO)
- [x] ACF PRO 6.3.4 installed by the user (SCF removed), Local JSON in `acf-json/`
- [x] Options page "M6 Settings" registered in code
- [x] Local site switched to PHP 8.5.1
- [x] Options page fields (header, footer, sound, effects, 404) and front page group with one tab per chapter + 3D scene (`acf-json/`, generated by `tools/acf/fields.mjs`); editor hidden on the front page (2026-11-18)
- [x] No form on the site (user, 2026-11-19): Contact Form 7 and the form code removed; chapter 10 is now the final shot with a "Get in touch" link to the developer (`template-parts/chapters/outro.php`); privacy page published without a form section
- [x] Demo content for all chapters and settings (`tools/acf/demo-content.php`) (2026-11-18)

## 5. Chapters (static first: text panels over stills, no motion)
- [x] 1 Hero (still is the LCP image, `fetchpriority="high"`; shown once the render is uploaded)
- [x] 2 Nose and lights
- [x] 3 V10 / Rev (SVG tachometer at the redline, figures, "Play the V10")
- [x] 4 Wheels and brakes (big numbers)
- [x] 5 Gills
- [x] 6 Carbon roof
- [x] 7 Tail and sound (player: play / pause, progress, aria-pressed, never autoplays; native player without JS)
- [x] 8 SMG III (list of 7)
- [x] 9 Spec sheet (real tables, 2 columns on desktop)
- [x] 10 Final shot: heading, text, "Get in touch" (link or email; falls back to the developer link) (2026-11-19)
- [x] 404, default page (2026-11-19)
- [x] Stills uploaded for chapters 1–8 and 10 (2026-11-19)

## 6. Motion: the 3D film
- [x] Lenis + anchors (land on the top of a chapter = start of its hold) (2026-11-19)
- [x] Fixed canvas behind the page, still → canvas cross-fade, driving loop (road, wheels, street lights) (2026-11-19)
- [x] Scroll-driven camera: scroll → p for `cameraPath().sample(p)`, holds = pinned text frames, legs = next frame sliding in (2026-11-19)
- [x] Chapter effects (3D side running with the scroll since part 1; HTML overlays in part 2, 2026-11-21): headlights on (2), limiter scrub + counters + flash + jolt (3, signature), disc glow (4), light bar (5), roof highlight (6), heat haze + sound (7), gear steps (8), dim for spec/form (9–10)
- [x] Pause rendering when the tab is hidden / footer or spec panel fills the screen; no-GPU / Save-Data / reduced-motion → stills; adaptive quality on weak GPUs (2026-11-19)
- [x] Video version for phones and weak graphics: scroll-scrubbed pre-rendered film (900p / 720×1560 portrait) + 17 idle loops, live → video hand-over (2026-11-19)
- [ ] Mobile LOD (model ≤ 1.5 MB) (phones now get the video; only tablets with live 3D need it)
- [x] Reduced-motion version of every chapter (checked 2026-11-21; fixed the film layout leaking into it)
- [x] Effects toggle from M6 Settings (2026-11-19)
- [x] Site copy of the night HDRI: packed WebP pair, 1.0 MB / 0.29 MB (2026-11-19)
- [x] Part 2: tachometer needle + counters, gear readout, V10 dial and SMG list on phones, haze with sound, load entrance, paint / gloss / speed fields (2026-11-21)

## 7. Checks
- [x] `check.mjs` at 1440 / 768 / 390, plus `--reduced-motion` (2026-11-21: 0 FAIL)
- [ ] `motion.mjs --mode gpu,nogpu --shots 8` (≥ 55 fps with GPU while scrolling through all chapters) (gpu done 2026-11-21: 60 fps everywhere; nogpu left)
- [x] `scan-theme.mjs --en` (2026-11-21: only dev tools)
- [ ] PHPCS (WordPress standard), `WP_DEBUG` on, no notices
- [ ] Skill checklist (`references/checklist.md`)

## 8. Portfolio case
- [ ] 60–90 s screen recording: scroll through the page + 15–20 s of editing in ACF
- [ ] 2–3 admin screenshots of fields with instructions
- [ ] Case text: task → role → decisions (signature, system, admin) → numbers (LCP, fps) → proof
