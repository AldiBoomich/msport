# Status

_Last updated: 2026-11-25_

## Where we are
- Stages 1–4 done. Photos approved, content imported (front page #9 "BMW M6"), motion checked frame by frame:
  - hero entrance (lights up + heading lines rise), hero → profile scene (profile car rises on the section entry `--in`);
  - hotspots: click → zoom to the point, detail panel on the right under the header, focus to the panel, Esc / Close
    return focus to the point; labels always on for touch screens;
  - POWER: LED, P400 → P500, 400 → 507, needle follows the recording along a curve measured from the sound
    (`tools/audio/rpm-curve.py`, venv package `soundfile`): two pulls to ~6,900 rpm with shifts 2 → 3 → 4 — the driver
    in the recording never reaches 8,250, so the needle stays out of the red zone (honest to the sound). The curve is
    built into `assets/js/power.js`; `opt_rpm_curve` is only for a different recording;
  - spec tabs: diagonal wipe, rows fade in, arrow keys / Home / End; photos of hidden tabs preload near the section;
  - drive collage drift ±30 px;
  - no-JS (checked with JS disabled): everything visible, details as cards, tabs stacked, P500 / 507 shown;
    reduced motion: 0 FAIL.
- Checks: check.mjs 1440/768/390 + reduced motion 0 FAIL (1 WARN on desktop: hotspot labels until hover — intended);
  motion.mjs gpu and nogpu 60 fps everywhere, no long tasks; JS 15 KB (unminified); PHPCS clean.

## Photo finish (2026-11-25, after the user's feedback "the photos look crude")
- `tools/images/studio.py` (recipe `press-m6/recipe-studio.json`, output `press-m6/studio/`): edge decontamination,
  smoked glass (hand-drawn polygons), plate filled on heritage-m6, hero rear fades into the dark (the source photo
  cuts the rear off), baked soft floor shadow + tyre contact shadows on a padded canvas; `<out>.json` gives the canvas
  offset to move hotspot coordinates. The CSS `.contact-shadow` blob is gone.
- Media #332–335 point to the `*-studio3.webp` files (older uploads of these four are still in uploads/2026/11, unused).
- Design hotspots moved to the new canvas. Spec tabs show cut-outs whole (`msport_is_cutout()` reads the alpha flag)
  on a soft studio glow. Heritage re-laid: heading + text in one row, then / now side by side.

## Gemini studio shots (2026-11-25, user's decision)
- The whole-car pictures are now Gemini studio shots (sources in `press-m6/gemini/`, recipe `press-m6/recipe-gemini.json`):
  hero = rear view in a dark smoky studio (full-bleed), profile = side view cut out (`cut3/`) with the baked studio
  shadow, design = rear three-quarter in a light studio (photo, edges melt into the chapter via a mask), heritage "now"
  = side view in the light studio, spec tab "Performance" = the hero photo. Interior, engine, detail and M635CSi photos
  stay (BMW press / Commons).
- Hero re-laid like Koenigsegg: model name "BMW / M6" large on the left (`--fs-display`), the action on the right at the
  same height, the lead low on the left; the ghost "M6" and the `.studio` backdrop are gone (`hero_wordmark` unused).
- `build.py` got `"strip": false` (a dark studio shot is not a BMW caption bar).
- Media #332–335 point to `*-gemini.webp`; older uploads of these four remain in uploads/2026/11 unused.

## Profile like Porsche (2026-11-25)
- Profile car = the user's grey 6 Series side view (BMW press photo; note: a 630i/650i facelift, not an M6 — the user
  chose it knowingly), cut out (`cut3/04-side-grey.png`), smoked glass + studio shadow (`recipe-studio3.json`).
- Behind it the ghost badge "M6" in the BMW M manner: Mona Sans wide 800 slanted −14° + the three M stripes (new tokens
  `--c-m-light/-dark/-red`, profile badge only), soft studio light on the stage. `profile_ghost` = "M6".

## Heritage as a matched pair (2026-11-25)
- "Now" = the user's grey 645Ci press photo (2004, front three-quarter on a road — the same angle as the M635CSi).
  Both in the same 16:9 frame (`msport-wide`, cover), then in B/W, now in colour, captions "Name, 1983" set as a large
  condensed year + name (`msport_year_caption()`), slight zoom on hover (mouse only).

## POWER chapter reworked (2026-11-25, user: "cheap, AI-sloppy")
- Direction chosen by the user: "night cluster". New `msport_tachometer()` (E63-style dial with the LED warning
  field), output display inside the dial, physical POWER key, engine bay as the dim backdrop, engine data as one fine
  line (`.spec-line`), heading without steps ("Naturally aspirated. / Ten cylinders."). power.js also writes `--rpm`.

## Tachometer removed, stage 5 done (2026-11-25)
- User: the tachometer "does not fit the design" -> removed (`msport_tachometer()`, the POWER key, P400/P500, the rev
  curve). The V10 chapter is now the engine bay as one large photo with the sound button on it (bottom left): play /
  pause, an amber ring runs with the recording, the photo lights up while it plays. Fields removed from the admin:
  `power_from/to/unit/mode_off/mode_on/idle/redline/scale_max`, `opt_rpm_curve`, `hero_wordmark` (their old values stay
  in the database, unused). `power_button_label` = "Hear the V10", `power_hint` = the note; lead rewritten.
- Stage 5 fixes: the header "Hear the V10" hides while the hero shows the same button; hotspot labels on phones hidden
  (the car is too small, they overlapped and ran off the screen; dots stay, the panel names the detail); profile car on
  phones centred and no longer cut at the edges; the left padding of all containers at 1200–1416 px (rail clearance
  formula had the wrong sign); `.detail:focus` outline only removed for non-keyboard focus; theme `screenshot.png`.
- Checks: check.mjs 1440/1200/768/390 + reduced motion 0 FAIL (1 WARN: hotspot labels until hover / on phones —
  intended); motion.mjs gpu + nogpu 60 fps, no long tasks; scan-theme clean (OUTLINE warn is the `:not(:focus-visible)`
  rule); PHPCS clean; JS 12.8 KB. The PHP notice "acf domain loaded too early" in debug.log comes from the ACF PRO plugin
  itself (acf.php:116), not from the theme.

## Next step
- The user looks at the new photos on the site; then commit + push. Possible extras: hero video loop, og:image.

## Cleanup (2026-11-25, user's go-ahead)
- Deleted 134 orphan files (13 MB) in uploads/2026/11: earlier versions of the four car photos with no media record.
- Deleted the `sample-*` duplicates in `press-m6/gemini/` (byte-identical to 01 / 02) and `tools/audio/rpm-curve.py`.
- The user sent three more photos, saved in `press-m6/raw/user/`; the only real M6 among them:
  `m6-silver-front34-wet-track.jpg` (1395 × 635).

## Spec sheet "Dimensions" = the silver M6 (2026-11-25, user's choice)
- The silver M6 cut out (`press-m6/cut4/`), studio finish with `recipe-studio4.json` (smoked glass hides the driver,
  plate removed with the new `"plate_fill": "sides"` mode of `studio.py`: each row blended from the bumper left and
  right of the plate), media #346 `m6-specs-m6-silver.webp` (1462 × 554, alpha). `specs_tabs_4_image` 333 -> 346;
  the profile keeps #333. Checked at 1440 / 390: 0 FAIL.

## Phones polished (2026-11-25, user: "the hero picture does not fit, the hotspots are too big")
- Hero on portrait phones: the landscape shot is no longer cropped to the rear panel — it is a band `min(212vw, 96svh)`
  wide (the whole car fills the screen width) between the name and the lead, top and bottom masked into the night;
  `sizes` tells the browser the real width (no blurry 768 file). A `hero_image_mobile`, if set, keeps the old cover
  (`.has-portrait`).
- Design hotspots on phones: 24px dot in a 44px tap area, label visually hidden (still the button name); the design
  photo is 100vw wide with a top/bottom fade instead of the radial mask.
- Header at 360px: no wrapping (nowrap on the wordmark and buttons; under 400px the menu shows only its bars).
- Checks: check.mjs 1440/768/390/360 + reduced motion 0 FAIL (phones 0 WARN); motion.mjs mobile 60 fps, no long tasks;
  scan-theme clean; PHPCS clean.

## All chapters checked on phones (2026-11-25)
- Shot every chapter at 393x852 and 360x640 (profile scene, V10, drive, spec sheet, heritage, outro, menu).
- Spec sheet on phones: the five tabs are one sideways strip (edge to edge, right end fades, no scrollbar); the chosen
  tab is brought to the middle of the strip (tabs.js, page does not move); under 480px the rows stack the label over
  the value (long values no longer broke mid-figure, e.g. "7,750 / rpm").
- Checks: check.mjs 1440/768/390/360 + reduced motion 0 FAIL, phones 0 WARN; JS 13.5 KB.

## Premium pass after the reference comparison (2026-11-25)
- Compared with Porsche 911 Turbo S / Ferrari 812 GTS / Koenigsegg at 1440x900 (same scroll points). Gaps: photos of
  different cars, images boxed in the container, every title heavy stepped caps, the same layout in every chapter,
  a solid header with filled buttons, a muddy grey day ground, little motion.
- Done in code: transparent header over the hero (solid past it, solid without JS); `msport_cta()` link-button (label +
  thin ring with play / chevron) in the header, hero and outro; chapter titles at weight 500 flush left (stepped only for
  the hero name and the outro); night `#0D0E10`, day `#F1F2F3` (AA re-measured); V10 = engine bay full screen with the
  title and the sound button on it; drive = cockpit full screen, then title + text in one row and a large tall + wide
  pair; design photo edge to edge; heritage pair edge to edge with the years on the photos; full-bleed photos open from
  an inset rounded card (`.bleed`, scenes.js `--rv`).
- Checks: check.mjs 1440/1200/768/390/360 + reduced motion 0 FAIL (1 WARN, hotspot labels — intended); motion.mjs gpu +
  nogpu 60 fps, no long tasks; scan-theme clean; PHPCS clean; JS 14.6 KB.
- Photos: `press-m6/gemini/PROMPTS-ROUND2.md` — 11 shots of the same Black Sapphire M6 to replace every other car
  (profile, front 3/4, engine, cockpit, SMG, wheel, details, heritage "now"), plus an optional video loop. Waiting for
  the user to generate them.

## One photo shoot: the round-2 shots are on the site (2026-11-25)
- Generated in the user's Gemini chat through Chrome (Claude typed the prompts), 11 shots of the same Black Sapphire M6:
  `press-m6/gemini/r2-01…r2-11`; site versions `press-m6/final/r2/` (recipe `recipe-round2.json`), media #347–358. Old
  media are untouched; the old field values are in `press-m6/fields-backup-before-r2.json`.
- Profile = three layers in one frame: the studio photo, the ghost badge, the car cut out on the same canvas
  (`tools/images/layer.py`). New fields `profile_backdrop`, `outro_image`.
- Design: the details also as a mosaic of large photo cards (Porsche-like) that open the same panel without the zoom.
- V10: less dimming, the heading in the shadow on the left. Outro: the front three-quarter shot edge to edge.
- Header: see-through over the photos, day tone over day chapters, solid when text would run under it. The rail takes a
  light ink on dark photos inside day chapters. Titles a step smaller in a wider column (two lines instead of four).
- Phones: V10 heading on its own shade, the cockpit framed on the wheel, heritage years under the photos, detail cards
  as a sideways strip.
- Checks: check.mjs 1920/1440/768/390/360 + reduced motion 0 FAIL (1 WARN, hotspot labels, intended); motion.mjs gpu +
  nogpu + mobile no warnings; PHPCS 0 errors (1 old naming warning); line endings of 8 files normalised to LF.

## AI tells removed from the round-2 shots (2026-11-25)
- Checked all 11 shots close up. Fixed (sources `press-m6/gemini/*-fix.jpg`, recipe `recipe-round2-fix.json`, the
  earlier web files kept in `press-m6/final/r2-before-fix/`; media #352, #353, #356, #357 rebuilt in place):
  - wheel: the M logos on a spoke and on the caliper removed (Gemini edit of the same photo);
  - SMG knob: the doubled N in the shift pattern (Gemini edit);
  - steering: the speedometer read 220, 260, 260 -> 220, 240, 260 (hand retouch, `press-m6/retouch-r2.py`);
  - tailpipes: the smeared badge on the boot lid painted out (hand retouch, same script).
- Still open: `r2-03-engine` (the "BMW M Power" lettering upside down on the left plenum, a malformed M logo, a "V10"
  badge, gibberish on the warning label). The Gemini daily image limit was reached; resets 2026-11-26 00:06.

## Open questions
- Optional: a short video loop for the hero; og:image / SEO plugin.
