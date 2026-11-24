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

## Next step
- Stage 5: full look at every screenshot (squint, silhouette, first screen at 390), up to 3 rounds of fixes; candidates:
  the duplicate "Hear the V10" (header + hero) on phones, the heritage layout ("now" car small), the dark car on the
  dark Performance tab, screenshot.png for the theme.

## Open questions
- None.
