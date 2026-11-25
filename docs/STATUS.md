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
- Project complete. Possible extras: a Gemini front three-quarter shot; og:image / SEO plugin.

## Cleanup (2026-11-25, user's go-ahead)
- Deleted 134 orphan files (13 MB) in uploads/2026/11: earlier versions of the four car photos with no media record.
- Deleted the `sample-*` duplicates in `press-m6/gemini/` (byte-identical to 01 / 02) and `tools/audio/rpm-curve.py`.
- The user sent three more photos, saved in `press-m6/raw/user/`; the only real M6 among them:
  `m6-silver-front34-wet-track.jpg` (1395 × 635).

## Open questions
- Where the new M6 photo goes (see the reply in chat).
