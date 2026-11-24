# Status

_Last updated: 2026-11-25_

## Where we are
- Stages 1–3 done. Photos approved by the user (2026-11-24); content imported (2026-11-25): 14 images in the media
  library (`_msport_src` meta = site file name), all front-page fields in English with the verified figures, credits
  and meta description in M6 Settings. Front page = page #9 "BMW M6". The one-off import mu-plugin was removed.
- Developer name / link in M6 Settings were already set before (Aldi1988); the outro button uses that link.
- First browser round done: hero re-laid (copy left, car right, ghost "M6" behind; h1 token now
  `clamp(2.25rem, 1rem + 3.6vw, 4.75rem)`), container leaves room for the chapter rail at ≥ 75em, hero → profile scene
  retimed (hero car stays while it scrolls away, profile car rises on the section entry `--in` from scenes.js),
  stronger hotspot dots, hotspot labels always on for touch screens.
- Checks: check.mjs 1440/768/390 and reduced motion: 0 FAIL, 1 WARN (hotspot labels hidden until hover with a mouse —
  intended, Ferrari-like). motion.mjs gpu: 60 fps in every section, no long tasks. PHPCS clean. scan-theme: one
  `outline: none` on the detail panel that only takes programmatic focus.

## Next step
- Stage 4 (motion): check and tune the hero entrance, hotspot click → zoom + panel, POWER (needle, sound, rpm curve —
  `tools/audio/rpm-curve.mjs` still to write; power.js has a built-in fallback curve), tabs wipe, collage drift,
  reduced motion / no-JS.

## Open questions
- None.
