# M6 E63: design system

The contract every template is built from. If a token you need is missing, add it here first.

## Subject
- **What:** a one-page presentation of the BMW M6 Coupé, E63 (2005–2010), built as a portfolio piece. The visitor is a
  car enthusiast or a potential client of the developer.
- **Main action:** "Hear the V10" (the sound of the engine); at the end, contact the developer.
- **What is different:** the only production BMW coupé with a 5.0-litre V10 that revs to 8,250 rpm. On start-up it gives
  400 PS (P400); the POWER button on the centre console unlocks all 507 PS (P500).
- **The world it is made of:** the S85 V10, SMG III paddles and the Drivelogic lever, the carbon-fibre roof, the M gills,
  four tailpipes, the orange-red night lighting of BMW instruments, the tachometer with its red zone at 8,250 rpm, the
  photo studio of a car launch (grey fog, a car on a seamless floor).

## Direction
A car-launch studio, by day and by night. Night chapters (graphite) carry the car and the engine; day chapters (light
studio grey) carry design details and the cockpit, like a press kit laid out on a table. The car is always shown as a
cut-out on our own studio backdrop, so photos from different sources read as one shoot.

Learned from the references (studied in the browser, 2026-11-24):
- Porsche 911 Turbo S: the hero photo dissolves into black while the side profile rises from below; big specs; collage
  of rounded photos moving at different speeds.
- Ferrari 812 GTS: the car on a light studio floor with hotspots; a click zooms the photo into the detail and slides in a
  panel; a chapter rail on the left.
- Koenigsegg: a grey fog studio; wide caps headlines set in stepped lines; tabs that swap the photo with a diagonal wipe.

**Signature (the one bold thing): the sound of the V10.** The engine chapter shows the engine bay large, dimmed, with a
sound button on the photo. Pressing it plays a real V10 recording: the photo lights up and an amber ring around the
button runs with the recording. Nothing else on the page is that loud. (Until 2026-11-25 this was a POWER key with a
tachometer; the user dropped it as not fitting the site.)

Rejected defaults:
- "Near-black + one acid accent": instead a full palette with light chapters; the amber accent has one job taken from the
  car (everything about engine speed) and never decorates.
- 3D / WebGL car (the previous version): dropped by the user; photos only.
- GSAP + Lenis by reflex: none of the three references uses them; native scroll, sticky scenes and small own modules.
- Caps eyebrow above every heading, `01 / 02` numbering: no; chapters are named in the rail only.

## Color (roles → values; contrast measured 2026-11-24)
| Token | Value | Role | Contrast |
|---|---|---|---|
| `--c-night` | `#16181B` | night chapters, page ground | – |
| `--c-night-2` | `#202328` | raised surfaces at night (panels, photo placeholders, ghost numbers) | – |
| `--c-day` | `#E7E8EA` | day chapters (studio floor) | – |
| `--c-day-2` | `#D8DADD` | day panels (hotspot detail panel, cards) | – |
| `--c-ink` | `#121316` | text on day | 15.2 on day, 13.3 on day-2 |
| `--c-ink-inverse` | `#F0F0EE` | text on night | 15.6 on night, 13.8 on night-2 |
| `--c-muted-night` | `#A1A5AC` | secondary text on night | 7.2 / 6.4 |
| `--c-muted-day` | `#575B62` | secondary text on day | 5.6 / 4.9 |
| `--c-amber` | `#FF7A1F` | the engine only: the progress ring of the V10 recording | 6.8 on night; **never on day** (2.1) |
| `--c-m-light`, `--c-m-dark`, `--c-m-red` | `#0066B1`, `#003D78`, `#E22718` | the three BMW M stripes, only in the profile ghost badge, mixed 45% into night | decorative |
| `--c-line-night` | `rgb(240 240 238 / .14)` | hairlines at night | – |
| `--c-line-day` | `rgb(18 19 22 / .14)` | hairlines by day | – |

Rules: 60/30/10 = night + day grounds / ink / amber. The focus ring uses the text colour of the chapter (3:1 on both
grounds), not amber. `::selection` = amber on night.

## Type
- **One family: Mona Sans** (GitHub, SIL OFL 1.1), variable, self-hosted `assets/fonts/mona-sans-vf.woff2`
  (subset Latin, axes `wdth` 75–125, `wght` 350–800, 102 KB). Its width axis gives three voices:
  - **Wide** (`font-stretch: 125%`, 700, caps): headlines (h1, h2), set in stepped lines.
  - **Normal** (100%): body and UI.
  - **Condensed** (75%, 500–600, `tabular-nums`): big figures (507, 8,250, 4.6).
- Scale:
  - body 17px / 1.6, weight 400;
  - small 14px / 1.45;
  - h3 22px / 1.25, weight 600, normal width;
  - h2 `clamp(2rem, 1.1rem + 3vw, 3.75rem)` / 1.0, wide caps, tracking 0;
  - display `clamp(3.5rem, 1rem + 6.4vw, 8.5rem)` / 0.9, wide caps 800: the model name in the hero (the h1), Koenigsegg-like;
  - h1 token `clamp(2.25rem, 1rem + 3.6vw, 4.75rem)` / 0.95, wide caps (plain pages);
  - figures `clamp(3.5rem, 1.5rem + 7vw, 8.5rem)` / 0.9, condensed;
  - ghost badge `clamp(10rem, 30vw, 30rem)`: "M6" behind the profile car (Porsche's "turbo S" idea) in the BMW M badge
    manner — wide 125% 800, slanted −14°, the three M stripes before it, dim (ink-inverse 14% in night), `aria-hidden`.
    The BMW M typeface is not available; Mona Sans wide + slant is the stand-in.
- Measure: body 60–65ch; headlines `text-wrap: balance`; paragraphs `text-wrap: pretty`.
- Units sit next to numbers with a no-break space: `507 PS`, `8,250 rpm`, `4.6 s`.

## Layout
- Container 1320px; text column 640px; gutters 48px desktop / 20px phone.
- Spacing scale (px): 4 8 12 16 24 32 48 64 96 128 160. Only these.
- Chapter padding by weight: power 160/96 (desktop/phone); profile, design, specs 128/72; drive 128/64; heritage
  96/56; outro 160/96. Hero and pinned scenes are viewport-height.
- Grid: 12 columns, asymmetric 5/7 and 4/8 splits; the cut-out car often breaks the container (up to the viewport edge).
- Radius by role: controls (buttons, tabs) `--r-control: 4px`; photos in the drive collage `--r-media: 12px`;
  hotspot dots are circles; cut-outs and full-bleed photos have no frame; panels are square.
- Elevation: only the hotspot detail panel and the open mobile menu float (`--shadow-float`). Cut-out cars stand on a soft
  contact shadow, never a drop shadow. The sticky header has a solid ground, no blur.
- Alignment: left-aligned by default. The profile scene and the outro headline are the only centred blocks.

## Motion
- Easing: `--ease-out: cubic-bezier(.16,1,.3,1)`; `--ease-in-out: cubic-bezier(.77,0,.175,1)`; linear only for the sound ring
  following the audio.
- Durations: press 120ms (`scale(.98)`); hover 180ms; UI 280ms; panel 420ms (exit 340ms); reveal 640ms; tab wipe 560ms.
- Moments:
  1. **Page load, hero:** the studio lights come up (a dark veil fades) and the headline lines rise from a mask; total
     ≤ 1.2s.
  2. **Scroll, hero → profile:** the hero car fades and scales down, the side profile rises over the ghost "8250"; the
     figures appear one by one at the end of the scene (sticky, scrubbed by scroll position).
  3. **Signature, the V10 sound** (described above).
- Responses (not moments): hotspot zoom + panel, tab wipe, a slight drift of the drive collage (≤ 40px).
- Hovers only for `(hover: hover) and (pointer: fine)`. Only `transform` and `opacity` animate.
- Reduced motion: no pinning, drift or zoom. The scene becomes a stacked layout. The hotspot panel fades in. The engine
  photo lights up without the slow zoom; the sound plays on press. Nothing is hidden.
- No JavaScript: everything is visible. Hotspots become a list of details under the photo, tabs become stacked tables, the
  V10 chapter shows a native audio player on the engine photo.
- Performance budget: LCP ≤ 2.5s on a phone, JS ≤ 25 KB on the front page, ≥ 55 fps while scrolling with a GPU. No
  preloader.

## Imagery
- **Cars:** high-resolution photos of the E63 coupé (Wikimedia Commons, CC licences), cut out (rembg, edges checked by
  eye) and placed on our studio backdrop with a contact shadow. One grade for all: neutral-cool, contrast +, saturation −10%.
- **Details, cockpit, engine:** official BMW Group press photos (BMW M6 Convertible 06/2006 set: same engine, SMG,
  wheels and cockpit; cropped so no soft top shows), plus the engine of the BMW M5.
- **Heritage:** BMW press photos of the M635CSi (E24), black and white.
- Ratios: hero full-bleed on desktop; on portrait phones the landscape shot is a band about twice the screen width
  (the whole car fills the width) between the name and the lead, melting into the night at top and bottom; drive collage 4:5 and 3:2; detail panel 3:2.
- Sources: `CREDITS.md`. Studio shots generated with Gemini (user's decision 2026-11-25), one look for all of them (see the prompts file).

## Components
- **Header:** wordmark "M6" left, "Hear the V10" right (scrolls to the V10 chapter; hidden while the hero shows the same button), menu on phones. 64px, solid
  `--c-night`. One line at every width: under 400px the menu button shows only its bars (the word stays for screen readers).
- **Chapter rail** (≥ 1200px): a dot per chapter on the left edge; the current one shows its name. Links, keyboard
  reachable.
- **Buttons:** primary = solid ink of the chapter (inverse ink on night, ink on day) with the opposite text colour;
  secondary = 1px outline. Height 48px, padding 0 24px, `--r-control`. States: hover (lighter by 8%), active
  `scale(.98)`, `:focus-visible` 2px ring + 3px offset, disabled 40% opacity.
- **Hotspot:** a 40px circle (`button`, `aria-expanded`), a 12px dot inside with a slow pulse; on hover or focus it
  extends into a pill with the label. Opens the **detail panel**: right 40% (full width on phones), `--c-day-2`, title,
  text, a 3:2 photo, a Close button. Esc closes, focus returns. Phones: a 24px circle in a 44px tap area, no label
  (the panel names the detail); the design photo runs the full screen width.
- **Tabs (spec sheet):** `role="tablist"`, arrow keys move between tabs; the underline of the active tab; rows as a
  definition list with tabular numbers.
- **V10 chapter (reworked again 2026-11-25: the tachometer is gone):** heading + lead in one row; the engine bay as one
  large photo (16:9, 4:5 on phones, `--r-media`), dimmed to 62% with a dark shade at the bottom left; the engine data
  as one fine line at the foot.
- **Sound button:** on the photo, bottom left: a 72px light disc (60px on phones) with play / pause, the label and a
  small note beside it; a hairline ring around the disc fills with amber as the recording runs (`--t`); while it
  plays the photo lights up to 100% (and zooms 3% unless reduced motion). `aria-pressed`.
- **Footer:** one line: developer link, photo credits link, model of the page. Nothing else.

## Page structure
1. **Hero** (night): what the car is and the one fact that matters (V10, 8,250 rpm); the way to the sound.
2. **Profile** (night): the shape of the car and four true figures (507 PS, 8,250 rpm, 4.6 s, 250 km/h).
3. **Design** (day): the details enthusiasts look for (carbon roof, gills, four tailpipes, 19-inch wheels and brakes,
   headlights), explored by hotspots.
4. **V10** (night): the signature, the engine photo with the sound; the engine facts under it.
5. **Drive** (day): SMG III, the M Drive button, the cockpit, the head-up display.
6. **Spec sheet** (night): engine, gearbox, chassis, dimensions in tabs.
7. **Heritage** (day): M635CSi (1983) to M6 (2005).
8. **Outro** (night): a big stepped headline, the developer link, credits.

## Copy rules
- Voice: a calm press kit written by an enthusiast. Short sentences, real numbers, sentence case in UI.
- CTA verbs: "Hear the V10", "Close", "Get in touch".
- Banned: elevate, seamless, cutting-edge, unleash, "Welcome to", arrows glued to button text, invented numbers.
