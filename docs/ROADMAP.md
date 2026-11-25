# Roadmap

Plan approved 2026-11-24. References: Porsche 911 Turbo S, Ferrari 812 GTS, Koenigsegg (see DESIGN.md → Direction).

## 0. Reset
- [x] Remove the 3D film and the old design (2026-11-24)

## 1. Documents
- [x] Study the references in the browser (scroll, click, frame-by-frame)
- [x] DESIGN.md (palette with measured contrast, Mona Sans, motion, signature POWER)
- [x] CONTENT-MODEL.md, CREDITS.md, CLAUDE.md
- [x] User approves palette and font (preview page, 2026-11-24)

## 2. Photos
- [x] Download BMW press candidates (M6 Convertible 2006 set, M5 engine, M635CSi)
- [x] Download Commons E63 coupé shots (rest saved by the user in the browser into `press-m6/raw/manual`)
- [x] Choose ~14, cut out the coupé shots (rembg), one grade, sizes (sheet: `press-m6/photo-sheet.jpg`)
- [x] User approves the photo sheet (2026-11-24)
- [x] Studio finish of the four car cut-outs after user feedback (2026-11-25, `tools/images/studio.py`): baked floor + tyre contact shadows, smoked glass, plate removed, hero rear fades into the dark, edge decontamination
- [x] Verify figures (Wikipedia BMW M6 + BMW S85): 507 PS @ 7,750, 520 Nm @ 6,100, 8,250 rpm, 4.6 s, 250 / 305 km/h, P400 = 400 PS, 1,785 kg, 4,872 × 1,854 × 1,377 mm, wheelbase 2,781 mm

## 3. Skeleton (static, complete without JS)
- [x] Tokens, font, header, footer, chapter rail
- [x] ACF field groups + options page (tools/acf/fields.mjs)
- [x] 8 chapter templates
- [x] Content import (media + fields) through a one-off mu-plugin (run 2026-11-25, removed)
- [x] Restore the V10 recording and the tachometer from git history

## 4. Motion
- [x] Hero entrance (lights up, heading lines rise; ≤ 1.1 s)
- [x] Hero → profile scene (sticky, scrubbed; the profile car rises on the section entry `--in`)
- [x] Hotspots: zoom + detail panel (under the header), focus to the panel, Esc returns focus
- [x] POWER: LED, 400 → 507, needle in time with the recording (curve measured by tools/audio/rpm-curve.py, peaks ~6,950 rpm)
- [x] Tachometer and POWER key removed at the user's request; the V10 chapter = engine photo with the sound button (2026-11-25)
- [x] Spec tabs with diagonal wipe (panel photos preloaded near the section), arrow keys
- [x] Drive collage drift (±30 px)
- [x] Reduced motion and no-JS versions (checked in the browser with JS disabled)

## 5. Checks
- [x] check.mjs 1440/768/390 + reduced motion, motion.mjs gpu/nogpu, scan-theme, phpcs
- [x] Look at every screenshot; at most 3 rounds of fixes (2 rounds, 2026-11-25)
- [x] Theme screenshot.png

## 6. Premium pass (after comparing with the references, 2026-11-25)
- [x] Transparent header, link-buttons with a ring, quieter chapter titles, near-white day / deeper night
- [x] Full-bleed V10 and drive photos opening from an inset card; design and heritage edge to edge
- [x] One photo shoot: the round-2 Gemini shots of the same Black Sapphire M6 (`press-m6/gemini/PROMPTS-ROUND2.md`), on the site 2026-11-25
- [ ] Optional: a short video loop for the hero
