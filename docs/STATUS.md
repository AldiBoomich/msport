# Status

_Last updated: 2026-11-24_

## Where we are
- Stage 1 (documents) done and approved (palette + Mona Sans).
- Stage 2 (photos) waiting for the user's approval of the photo sheet `C:\Users\aaldi\Local Sites\msport\press-m6\photo-sheet.jpg`:
  - Coupé shots from Commons were saved by the user in the browser into `press-m6\raw\manual\` (Wikimedia answered 429
    to scripts). Cut-outs (rembg BiRefNet) in `press-m6\cut2\`, all clean.
  - Proposed roles: hero = blue coupé front 3/4 (Retro Classics IMG_4810, "M6" placard instead of a plate), profile =
    grey coupé side (4584515863), design = the same blue coupé rear 3/4 (IMG_4809), heritage "now" = black coupé
    (2011-11-08). Details, engine, cockpit, SMG from BMW press photos; M635CSi B/W.
  - All site photos in `press-m6\final\` (WebP, one grade). Recipes: `recipe-bmw.json`, `recipe-fix.json`,
    `recipe-cars.json`; tools `tools/images/cutout.py`, `tools/images/build.py`.
- Stage 3 (skeleton) written ahead: ACF groups, options page, 8 chapter templates, CSS from the tokens, JS modules
  (scenes, nav, hotspots, POWER, tabs). PHPCS clean; the page renders without errors but has no content yet.
- Figures verified against Wikipedia (BMW M6, BMW S85) — see ROADMAP.

## Next step
- After the approval: fill CREDITS.md, content import (media + fields) through a one-off mu-plugin, first look in the
  browser.

## Open questions
- Photo sheet approval (colour mix: blue hero/design, grey profile).
- The cockpit shot (convertible) shows a light corner top right; it will be recropped.
