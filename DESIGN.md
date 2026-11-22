# M6 E63 “Redline”: design system

Single-page showcase of the BMW M6 E63 (2005–2010) built as a portfolio piece.
Every section of the site is built from this contract. If a token is missing, add it here first, then to `:root`.

---

## Subject
- **What it is:** a single-page presentation of the E63 M6 coupe: its V10, its numbers, its details, told by one 3D car.
- **Who sees it:** potential clients and employers looking at the developer's portfolio; car people who know the E63.
- **Main action:** hear the V10 (header button) and read the spec sheet (hero button). No form on the site (user's decision, 2026-11-19). The last chapter links to the developer.
- **What is different:** the E63 is the high-revving one. A naturally aspirated 5.0 V10 that pulls to 8,250 rpm. The whole site is built around revs, not around "luxury".
- **The world it is made of:** the tachometer and its red zone, the shark nose and angel-eye headlights, carbon-fibre roof weave, the side gills, the quad exhausts, the SMG III 7-gear readout, factory paint names (Sepang Bronze, Black Sapphire, Silverstone II, Interlagos Blue), a night track and sodium lights.

### Facts used on the site (verify every number before publishing)
| Item | Value | Status |
|---|---|---|
| Engine | S85B50, 4,999 cc V10, naturally aspirated | to verify |
| Power | 507 PS / 373 kW at 7,750 rpm | to verify |
| Torque | 520 Nm at 6,100 rpm | to verify |
| Redline | 8,250 rpm | to verify |
| Gearbox | SMG III, 7 speeds, sequential | to verify |
| 0–100 km/h | 4.6 s | to verify |
| Top speed | 250 km/h limited (305 km/h with M Driver's Package) | to verify |
| Roof | carbon-fibre reinforced plastic (coupe) | to verify |
| Years | 2005–2010 | to verify |

All numbers live in ACF fields, never in templates (see `docs/CONTENT-MODEL.md`).

---

## Direction
**The whole site is one 3D film around one car.** A single real-time 3D scene of the black E63 driving at night sits behind the entire page. First we see the car whole; then every scroll step moves the camera to the next part of the car (nose and headlights, bonnet, wheels, gills, roof, tail and exhausts, side profile) and that chapter's text slides in beside it. The car never leaves the screen and is always in motion. The interior is not shown.

The page is dark like a night track, numbers are big and engineered. The car itself is **Black Sapphire Metallic**, a deep glossy black that is only visible through its reflections. The one warm colour is Sepang Bronze, the E63's other signature paint, used for UI and for the sodium street lights that slide over the black body. Red appears only where the needle enters the red zone.

**Signature (the one bold thing): the Rev chapter.**
The camera hangs over the bonnet and the scene lights dim. A large analogue tachometer drawn in SVG appears over the 3D car. Scroll drives the needle from idle (≈ 800 rpm) to 8,250 rpm. Power and torque figures count up in sync with the needle, the red zone (7,500–8,250) lights up, and at the limiter the scene "hits" the cut: one short shake of the needle, a single flash of the red zone and a small jolt of the 3D camera. A button next to it plays a V10 recording, only on user press.

**Rejected defaults**
- Light "paddock / blueprint" aesthetic (variant B): rejected by the client, the brief is dark.
- Pure near-black (`#0B0B0B`) + one acid accent + monospace labels: the stock "dark tech" look. Replaced with a blue-graphite ground taken from Black Sapphire metallic and a warm metallic accent from the car's paint.
- BMW M tricolour as accent colours: the first idea anyone has. Not used as UI colour.
- Centred hero with a big headline and three icon cards under it: replaced by a full-bleed car shot with the headline set low-left, like a spec plate.
- Fade-up on every section: replaced by camera moves around the car; the text of each chapter simply slides in while the camera travels.
- Background video of the car: no good E63 footage exists. Replaced with a real-time 3D E63, which shows the car in motion and is a stronger portfolio piece.
- A stack of photo sections (design-details strip, interior, sound band): replaced by camera moves around the same 3D car, so the page has one subject and one continuous scene.
- Silver or bronze car: the client chose deep glossy black. Black paint is only beautiful with good reflections, so the scene is lit by moving street lights and an HDR environment rather than by flat studio light.

**Motion budget deviation (client brief):** the brief asks for "maximum effects". The skill default is 1–2 moments per page; here the whole page is one scrubbed 3D scene with ten chapters, each tied to a specific part of the car. `slop-ok: motion-budget`. Every chapter has a reduced-motion version and a no-GPU fallback.

---

## Color (roles → values; contrast measured against `--c-ground`)
| Token | Value | Role | Contrast |
|---|---|---|---|
| `--c-ground` | `#14171B` | page background, Black Sapphire graphite (≈ 60%) | – |
| `--c-surface` | `#1D2126` | raised bands, spec table, form (≈ 30%) | – |
| `--c-surface-2` | `#262B31` | hover / pressed surfaces, inputs | – |
| `--c-ink` | `#E8E6E1` | text, warm silver | 14.41:1 (12.97 on surface) |
| `--c-muted` | `#9EA3A8` | secondary text, units, captions | 7.07:1 (6.36 on surface) |
| `--c-action` | `#C08A5B` | Sepang Bronze: primary button fill, links, needle, active states (≈ 10%) | 6.02:1; dark text on it 6.02:1 |
| `--c-action-hi` | `#D29C6A` | hover of action | 7.45:1 |
| `--c-redline` | `#E5482E` | **only** the red zone, the limiter flash and form errors | 4.54:1 on ground (large text / UI only on surfaces: 4.08:1) |
| `--c-line` | `#3A4047` | hairlines and dividers (decorative) | 1.72:1, not used for meaning |
| `--c-field` | `#737A82` | form field borders, focus-independent UI outlines | 4.14:1 (3.73 on surface) |

Rules
- Red never decorates. If it is red, it means "limit" or "error".
- Bronze is the only fill colour for buttons. No gradients on text. One subtle radial light behind the car in the hero is allowed (it is a light source, not a decoration).
- Render grade follows the palette: cool shadows, warm highlights from sodium lights.
- Text over the 3D scene sits on a local scrim (fade of `--c-ground` from 0 to 85% behind the text column), so AA contrast holds over any frame. The scrim is a light-blocker, not a decoration.

---

## Type
One variable family used at two widths: **Archivo** (Omnibus-Type, SIL Open Font License, variable `wdth` 62–125 and `wght` 100–900). Self-hosted woff2, Latin + Latin Ext subset.
- **Display** (headlines, big numbers): Archivo at `wdth 125` (Expanded), weights 700–800. Feels like engraved instrument numerals.
- **Text / UI:** Archivo at `wdth 100`, weights 400 and 600.
- Fallback: Arial with `size-adjust` / `ascent-override` tuned to Archivo so the swap does not shift layout.
- Preload: one file (the variable woff2).

Scale (base 17 px, ratio ≈ 1.25 for content, display jumps freely)
| Level | Size | Line height | Tracking |
|---|---|---|---|
| small | 14 px | 1.5 | 0 |
| body | 17 px | 1.6 | 0 |
| lead | 20 px | 1.5 | 0 |
| h3 | 24 px | 1.25 | -0.01em |
| h2 | `clamp(2rem, 1.2rem + 3vw, 3.5rem)` | 1.05 | -0.02em |
| h1 | `clamp(2.5rem, 1.2rem + 5vw, 6rem)` | 1.0 | -0.03em |
| number-xl (single hero number) | `clamp(4rem, 2rem + 9vw, 11rem)` | 0.9 | -0.04em |
| number-l (figures inside a chapter panel: PS, Nm, s, km/h) | `clamp(2.5rem, 1.75rem + 3vw, 4.5rem)` | 0.95 | -0.03em |

- Numbers: `font-variant-numeric: tabular-nums` everywhere a number changes (counters, rpm, spec table).
- Units sit next to the number with a non-breaking space and use `--c-muted`: `507&nbsp;PS`.
- Measure: body text `max-width: 62ch`, hero headline `max-width: 14ch`.
- `text-wrap: balance` on headings, `pretty` on paragraphs.
- No caps eyebrow over every heading. Small labels are sentence case, same family.

---

## Layout
- Container 1320 px; text column 680 px; gutters 32 px desktop, 20 px mobile.
- 12-column grid, asymmetric splits (5/7, 4/8). Left content edge is the same in every section.
- Spacing scale (px): 4 8 12 16 24 32 48 64 96 128 160. Nothing outside it.
- Chapters 1–8 are full-viewport scroll zones over the fixed 3D canvas (length per chapter in Motion → Chapters). Spec sheet is a normal-height section on a ground-coloured veil (70%) in film mode, so the car turning behind it shows through dimly (`--c-surface` panel without the film), padding 128 / 96 / 64 (desktop / tablet / mobile).
- Chapter text column: 5 of 12 columns on the left; the camera frames the car detail in the right 7 columns. Mobile: the detail sits in the top 60% of the viewport, the text panel below.
- Width as a tool: 3D canvas full-bleed, text narrow, spec table container width.
- Radius by role: buttons 4 px (machined, not pill), inputs 4 px, media 0 px, cards none (there are no cards).
- Elevation: only the sticky header after scroll and the sound player float. Shadow token `--shadow-float: 0 1px 0 #0006, 0 12px 32px -12px #000c`. Everything else is held by space and hairlines.
- Alignment: left everywhere. The only centred element is the tachometer.

---

## Motion
- Durations: press 120 ms, hover 180 ms, UI (menus, form states) 240 ms, reveals 600–900 ms.
- Easing: UI `cubic-bezier(0.2, 0, 0, 1)`; reveals `cubic-bezier(0.16, 1, 0.3, 1)`; scrubbed scenes are linear to scroll. No spring / bounce.
- Hover effects only inside `@media (hover: hover)`.
- Stack: Lenis smooth scroll + own scroll → camera mapping (no GSAP: everything is one number, the rail position), one Three.js canvas (GLTFLoader + Meshopt). All self-hosted, built by `tools/build` into `assets/js/film/`. The page script (Lenis, ~7 KB gzipped) is a deferred module; Three.js is a dynamic `import()` started after the LCP image has painted, so it never blocks the first paint.

### How the 3D film works
- One `<canvas>` is `position: fixed; inset: 0` behind the whole page. The HTML chapters scroll above it.
- The car is static in world space and always "driving": the asphalt texture and lane lines scroll under it, the wheels and brake discs spin at a matching speed, street lights pass overhead every ~1.8 s and their warm highlights slide along the black paint. A faint road-speed camera shake (≤ 0.3°).
- **Scroll moves only the camera** (and per-chapter effects). Each chapter has a camera key: position, target, field of view (`tools/3d/chapters.js`, art direction, not content; text lives in ACF). Between two keys the camera travels along one smooth rail (`tools/3d/camera-path.js`).
- **Layout of a film chapter** (built 2026-11-19, `main.css` → 8.0): the section is a tall scroll zone (`--film-len`: 150svh, V10 and SMG III 250svh). Its text frame (one screen tall, or taller when the text needs it) sticks to the bottom of the screen: while it is pinned, that is the chapter's **hold** (the camera rests on the key, the chapter effect plays with the scroll, ft 0→1). While the next frame slides in from below, that is the **leg** (the camera travels to the next key). The text never moves while it is being read, and the camera never moves under text.
- The flag `html.film` is set in `<head>` before the first paint (no reduced motion, no Save-Data, effects on in M6 Settings), so the tall layout never jumps in later. Film-mode CSS is always scoped to `html.film` (`<main>` carries the class `film` too). In that layout each chapter's still sticks to the screen too: until the 3D scene is live, and on devices where it cannot run, the film plays as pinned pictures.
- First paint: the still of chapter 1 (the LCP element) with the headline. When Three.js and the model are ready (after the LCP, on idle), the stills fade out over the live canvas (400 ms) at the same camera angle; landscape stills are nudged sideways so the cross-fade does not double the car on screens narrower than 16:9.
- Load entrance (once, built 2026-11-21): the hero headline, sentence and button settle in (900 ms, reveal easing, 120 ms apart), CSS only, so it never waits for a script; the hero still (LCP) does not move. Headlights stay off in the hero: switching them on is chapter 2's moment.
- Lenis on the whole page; anchors from the nav scroll (Lenis, 1.6 s) to the top of a chapter, which is the start of its hold. Keyboard focus keeps `scroll-padding-top` for the header.
- **Adaptive quality**: the scene measures its own frame time after load. Where it cannot hold ~50 fps (integrated graphics), it steps down, least visible first: device pixel ratio 1 → MSAA off (FXAA instead) → 0.75 resolution → 0.6 resolution without bloom. Full quality stays untouched where it runs smoothly (RTX 4050: 60 fps at DPR 1.5; Intel UHD: 25 → 54–60 fps).
- Drawing stops while the opaque footer fills the screen, and when the tab is hidden.
- **Video version** (built 2026-11-19, user's decision): phones, and computers whose graphics cannot run the scene or hold it at ~50 fps in its first frames (median frame time of frames 6–17 above 22 ms, later of every 90 above 25 ms), get the same film pre-rendered at full quality as video, scrubbed by the scroll (`src/film/video.js`). It fades in over the stills, or over the live canvas, which is then freed.
  - Files in `assets/video/`: `film-900.mp4` (1600×900, for landscape screens) and `film-portrait.mp4` (720×1560, 9:19.5 like the portrait stills), each with `-loops.mp4`. H.264, CRF 26, a keyframe every 8 frames and no B-frames, so a seek takes ~5 ms (measured 3–10 ms on RTX 4050 and Intel UHD).
  - Timeline (`tools/3d/video-timeline.js`, shared by the renderer and the page): hold, leg, hold… 1440 frames at 30 per second of simulated driving; 90 frames per screen of scroll.
  - **Idle loops:** when the scroll rests 300 ms inside a calm stretch of a hold, a 2 s seamless loop of that state (road, wheels, street lamps moving) fades in (400 ms) and fades out when the scroll moves (250 ms). 17 loops, one per calm state (one per gear in SMG III); none where the effect itself moves (the light bar in gills and roof).
  - The video is rendered without grain (a per-frame grain bloats it); the page lays a light animated grain over it.
  - The whole file is fetched before use (instant seeks anywhere); until then the stills play the film.
  - Render: `node tools/3d/video.mjs <dir> 1920 1080 1` and `<dir> 720 1560 1.5` (needs puppeteer-core and three in `tools/3d/node_modules`, RTX: ~4 min each), then `node tools/3d/video-pack.mjs <dir> <ffmpeg> assets/video/film-900 1600 900 26`. Re-render after any change to the scene or the rail.

### Chapters
| # | Chapter (anchor) | Scroll length | Camera | Effect | Overlay (HTML) |
|---|---|---|---|---|---|
| 1 | Hero (`top`) | 150 vh | wide front three-quarter, slow chase-camera drift | driving loop, street lights across the paint | `<h1>`, one sentence, primary button, low-left |
| 2 | Nose and lights (`front`) | 150 vh | dolly in low to the shark nose and headlights | headlights and angel eyes switch on, one street light sweeps the bonnet | heading + text |
| 3 | V10 / Rev (`rev`, signature) | 250 vh | crane up and hang over the bonnet | scene lights dim to near black; at the limiter: camera jolt ≤ 0.5° + red flash | SVG tachometer 800 → 8,250 rpm, power / torque counters, "Play the V10" |
| 4 | Wheels and brakes (`wheels`) | 150 vh | orbit down to the front wheel, rim fills a third of the frame | wheel spins up, then brakes hard; the disc glows warm (emissive ramp) and the camera dips | heading, text, 0–100 and top-speed numbers |
| 5 | Gills (`gills`) | 120 vh | track along the side at gill height | a thin light bar sweeps across the gills and door | heading + text |
| 6 | Carbon roof (`roof`) | 120 vh | top-down, slow 30° yaw | a highlight runs along the roof weave | heading + text |
| 7 | Tail and quad exhausts (`sound`) | 150 vh | low behind the car, close to the four tips | heat haze above the tips, stronger while the sound plays | heading, text, sound player |
| 8 | SMG III (`smg`) | 250 vh | low side profile | gear readout 1 → 7; on each step a short camera jolt and the road speeds up | heading, intro, gear readout with one line per gear |
| 9 | Spec sheet (`specs`) | content | pull back high and wide, car slowly turns | scene dims to ~40% | spec tables on a see-through veil (70%) over the car |
| 10 | Final shot (`outro`, anchor `contact`) | film | final front shot, headlights into the camera | bloom at 0.43× (headlights face the lens: a tight glow, no milky veil over the black bonnet) | heading, two lines about the project, "Get in touch" button to the developer |

Effects are kept cheap: the light bar and the street lights are moving area / spot lights; the disc glow is an emissive ramp on `brake_disc`; the heat haze is one small screen-space distortion pass only active in chapter 7. While the V10 recording plays, the haze grows to 1.6× over ~1 s (live scene only; the video keeps its rendered haze).

**HTML overlays** (`src/film/overlays.js`, built 2026-11-21) read the same rail state as the camera, so they match the live scene, the video and the pinned stills alike. The rev curve and the gear steps live in `tools/3d/chapter-timeline.js`, shared with the 3D effects (changing it means re-rendering the video).
- V10: the needle and readout follow the rev curve, rescaled to the idle / redline from the admin; the red zone is dim (30 %) until the needle enters it; on the limiter the readout turns `--c-redline` and the zone flashes once (stroke 18 → 8, 500 ms) when the scroll plays into the cut. The figures count up to their value as the needle passes their `at_rpm` (counter box as wide as the final figure; screen readers get the final figure).
- SMG III: the gear list becomes a readout: the current gear at number-l, a strip 1–7 whose hairlines fill bronze as the gears go up, and that gear's line (all lines stacked in one cell, so the frame never changes height). The list stays for screen readers; the readout is `aria-hidden`.
- Phones: the dial sits under the text (17 rem), so it stays on screen while the hold plays.

### Reduced motion (`prefers-reduced-motion: reduce`) and no GPU
- No scrub, no camera travel, no Lenis, no fixed canvas. Each chapter becomes a normal section with its own pre-rendered still (same camera key, motion-blurred road so the car still looks like it is driving) and its text beside it.
- Optional "Play the 3D scene" button in the hero turns the live scene back on.
- Tachometer shows the needle at 8,250 with final numbers; the gear readout shows all 7 gears as a list.
- Short opacity fades (≤ 200 ms) remain. Nothing stays hidden.

3D / WebGL
- Model: "BMW M6 (E63)" by Mona x Supercars, Sketchfab, CC BY 4.0 (72k triangles, 17 materials). Credit in the footer credits link and in `CREDITS.md`.
- Preparation (done 2026-11-17, script `tools/3d/bl_prepare.py`, Blender 4.2 LTS + gltf-transform): the source is a SketchUp export with every surface doubled (front + inverted back face). Pipeline: delete edge-line objects → remove back faces (ray-tested; unsure pairs kept as `*_back` objects so nothing opens up) → weld → Catmull-Clark ×1 on paint, black trim, underbody, tyres and rims with creases on edges > 45–60° → smooth by angle + weighted normals → split the merged wheels into `wheel_LF / RF / LB / RB` nodes with pivots on the axle (rotate around local X) → inches to metres, car centred on the ground → WebP textures ≤ 2048 px, Meshopt compression.
- Result: `assets/3d/m6-e63.glb`, 149k triangles, **2.2 MB**, size 2.03 × 4.86 × 1.39 m. Material names are roles: `paint`, `trim_black`, `underbody`, `plastic`, `chrome`, `glass`, `lights`, `lights_glass`, `interior`, `rim`, `tyre`, `brake_disc`. Previews in `assets/3d/previews/`.
- Requires `EXT_meshopt_compression`, `EXT_texture_webp`, `KHR_mesh_quantization`: load with `GLTFLoader` + `MeshoptDecoder`.
- **Paint: Black Sapphire Metallic.** `MeshPhysicalMaterial` set in code (replaces `paint`): base colour `#050608`, metalness 0.45, roughness 0.32, `clearcoat` 1.0, `clearcoatRoughness` 0.02. No flake normal map (the model's UVs are uneven and the flakes read as dust). Glass: dark tint `#0b0d10`, opacity 0.82, double-sided. Everything else single-sided.
- Reflections that make black look expensive: a procedural "night studio" environment (black void with long overhead and side light bars, warm sodium colour from `--c-action`, faint cool horizon) built with `PMREMGenerator.fromScene`. The city HDRI breaks into window-shaped blotches on black paint, so it is only a fallback.
- Other materials: dark-tinted glass (transmission off for speed, high reflectivity), chrome-free trim in satin black, tyres matte, brake discs with slight anisotropy, headlights emissive.
- Light: HDR environment (night city / road HDRI, CC0, Poly Haven) for reflections, plus moving warm area lights for the street lights (colour from `--c-action`), one cool rim light from behind. Tone mapping ACES or AgX, exposure tuned so the black stays black and the reflections carry the shape.
- Road: tiling asphalt texture (CC0) with scrolling UVs, lane lines, subtle wet reflection under the car. Fog to the ground colour `--c-ground` so the scene melts into the page.
- Close-ups: the model has no engine bay, so the V10 chapter is the bonnet + tachometer. Before layout, every chapter camera key is test-rendered in `tools/3d/viewer.html` to check close-up quality (headlights, gills, rims, exhaust tips).
- Fallback: if `getContext('webgl2', { failIfMajorPerformanceCaveat: true })` fails, on Save-Data, or if the scene is not ready within 6 s, the page keeps the pinned per-chapter stills (film layout) — or, for reduced motion and effects off, the plain static page (see Reduced motion). The first screen never waits for WebGL.
- Budget: one WebGL context for the whole page, DPR ≤ 1.5 (≤ 1.25 on mobile), shadows baked or one small contact shadow, render loop paused when the tab is hidden and while the footer fills the viewport.

Performance budget
- LCP ≤ 2.5 s on mobile (4G profile), CLS ≤ 0.05. LCP is the chapter 1 still, not the canvas.
- JS: ≤ 90 KB gzipped before the LCP (theme + Lenis, measured ~10 KB); Three.js and loaders (≈ 200 KB gzipped) load after it.
- 3D assets: `.glb` ≤ 4 MB desktop / ≤ 2 MB mobile, HDRI ≤ 1 MB: the Shanghai Bund panorama packed by `tools/3d/hdr-pack.mjs` into a WebP colour + gain pair, decoded on the GPU (`tools/3d/city-sky.js`): 4K = 1.0 MB desktop, 2K = 0.29 MB mobile; renders match the 25 MB `.hdr` (checked side by side).
- ≥ 55 fps while scrolling with a GPU; without a GPU ≥ 30 fps and no long tasks > 200 ms, otherwise fall back to the static version.

---

## Imagery
- Source: the 3D scene itself. Every image on the page is a **chapter still**: a render from that chapter's camera key, same paint, same light. Photos are not needed. No AI-generated images.
- Grade: night, low key, cool shadows, warm sodium highlights. One grade for every still, matching the live canvas.
- Stills: 16:9 landscape (2560 × 1440) and 9:19.5 portrait (1200 × 2600) per chapter, the shape of a full-screen chapter, so the switch between still and live canvas is invisible (changed from 21:9 / 4:5 on 2026-11-19: those were cut by half on phones). Portrait screens get the portrait render. The chapter 1 still is the LCP image.
- Sizes: up to 2560 px wide, AVIF/WebP, quality 75–82. Focal point field per image.
- Sound: one V10 recording (≤ 15 s, ≤ 400 KB, AAC/Opus), listed in `CREDITS.md`.

---

## Components
- **Header:** text wordmark "M6 E63" (no BMW logo), 4–5 anchor links, primary button. Transparent over the hero, becomes `--c-ground` with `--shadow-float` after 80 px of scroll. Mobile: full-screen menu, focus trapped, `Esc` closes.
- **Buttons:**
  - primary: bronze fill, `--c-ground` text, 4 px radius, 48 px tall, label is a verb ("Hear the V10"). Hover `--c-action-hi`, active pressed by 1 px, `:focus-visible` 2 px `--c-ink` ring with 3 px offset, disabled 40% opacity + `not-allowed`.
  - secondary: 1 px `--c-field` outline, ink text.
  - text link: bronze, underlined (`text-underline-offset: .2em`, 1 px).
  - No arrows glued to button labels.
- **Spec row:** label (muted) | value (ink, tabular) | unit (muted). Hairline between rows.
- **Big number:** number-l (in a chapter panel, up to 4 in a grid) or number-xl (one number alone) + unit in `--c-muted` + one-line caption; optional footnote in small muted text. V10 on phones and tablets: the three figures sit in one row under one hairline at h2 size (shrinks with the screen), final values only; the dial does the counting.
- **Tachometer:** inline SVG, 270° dial 0 → redline rounded up to 1,000; minor ticks every 250 rpm, numerals every 1,000 (×1000); track `--c-line`, red zone `--c-redline` (red-zone start → redline), needle `--c-action` with a `--c-surface-2` hub, readout in the centre. Static state = needle at redline. Centred in its column.
- **Gear readout (SMG):** ordered list, gear number in display width at h3 size, one line of copy each (static state). In the film: current gear at number-l + strip 1–7 (small numerals over 2 px hairlines, past and current in `--c-action`, current numeral `--c-ink`) + the current line.
- **Sound player:** play/pause button with a visible label ("Play the V10", "Pause"), progress line, `aria-pressed`. Never autoplays.
- **Chapter panel:** `<h2>`, text (62ch max), optional big numbers; sits on the scrim in the left 5 columns. Never a card.
- **Footer:** contact for the developer, credits link.

---

## Page structure (one page, front page)
All chapters play over the same fixed 3D scene (see Motion → Chapters).
1. **Hero:** the whole black E63 driving at night, headline about revs (e.g. "Ten cylinders. 8,250 rpm."), one sentence, primary button. Tells in 3 seconds what the page is.
2. **Nose and lights:** the shark nose and headlights, short text.
3. **V10 / Rev (signature):** camera over the bonnet, the S85 V10 explained through the tachometer: 507 PS, 520 Nm, 8,250 rpm.
4. **Wheels and brakes:** the front wheel close up, 0–100 and top speed.
5. **Gills:** the side gills, short text.
6. **Carbon roof:** the roof from above, short text.
7. **Tail and sound:** the quad exhausts close up, the V10 play button.
8. **SMG III:** side profile, 7-gear readout and the story of the gearbox (and why people love/hate it).
9. **Spec sheet:** full technical table (ACF repeater) over the dimmed car.
10. **Final shot:** the car's headlights into the camera, who built the site, "Get in touch" (link or email of the developer).
11. **Footer.**

No interior chapter.

Other templates use the same tokens and header/footer: 404 ("You hit the limiter"), privacy page, default page.

---

## Copy rules
- Voice: confident, technical, short. Talk like an engineer who loves the car, not like an ad.
- Concrete: numbers with units, names of parts, years. No vague superlatives.
- CTA verbs: Request, Play, Explore the specs, Send request.
- Banned: elevate, seamless, cutting-edge, unleash, next-level, "Welcome to our website", "Learn more", "Submit", "10,000+ happy clients".
- All visitor and admin text is English.
