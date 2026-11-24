# Status

_Last updated: 2026-11-24_

## Where we are
- Stage 1 (documents) done and approved (palette + Mona Sans).
- Stage 2 (photos) in progress:
  - BMW press photos downloaded and processed into `C:\Users\aaldi\Local Sites\msport\press-m6\final\` (caption bar
    stripped, one grade): headlights, wheel, gills (coupé), tailpipes (coupé), SMG, steering wheel, cockpit, engine (M5 /
    M6 bay), M635CSi ×2 (B/W).
  - Tools: `tools/images/cutout.py` (rembg BiRefNet, keeps the largest object, optional pre-crop) and
    `tools/images/build.py` (strip caption bar, crop, grade, WebP). Venv: `C:\Users\aaldi\Local Sites\msport\.venv`.
  - Wikimedia Commons answers 429 (too many requests) for this IP; 4 of 15 coupé photos downloaded. The hero, profile and
    design cut-outs need the remaining full-car shots (Prévot 17, Migl 4809/4810, nakhon side, OSX side).
- Stage 3 (skeleton) written ahead: ACF groups, options page, 8 chapter templates, CSS from the tokens, JS modules
  (scenes, nav, hotspots, POWER, tabs). PHPCS clean; the page renders without errors but has no content yet.
- Figures verified against Wikipedia (BMW M6, BMW S85) — see ROADMAP.

## Next step
- Get the remaining Commons photos (wait for the limit, or the user saves them in the browser), cut out the coupé,
  show the photo sheet for approval, then the content import (media + fields) and the first look in the browser.

## Open questions
- None besides the photo download.
