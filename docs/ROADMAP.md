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
- [ ] User approves the photo sheet
- [x] Verify figures (Wikipedia BMW M6 + BMW S85): 507 PS @ 7,750, 520 Nm @ 6,100, 8,250 rpm, 4.6 s, 250 / 305 km/h, P400 = 400 PS, 1,785 kg, 4,872 × 1,854 × 1,377 mm, wheelbase 2,781 mm

## 3. Skeleton (static, complete without JS)
- [x] Tokens, font, header, footer, chapter rail
- [x] ACF field groups + options page (tools/acf/fields.mjs)
- [x] 8 chapter templates
- [ ] Content import (media + fields) through a one-off mu-plugin
- [x] Restore the V10 recording and the tachometer from git history

## 4. Motion
- [ ] Hero entrance (lights up)
- [ ] Hero → profile scene (sticky, scrubbed)
- [ ] Hotspots: zoom + detail panel, keyboard, Esc
- [ ] POWER: LED, 400 → 507, needle in time with the recording (rpm curve)
- [ ] Spec tabs with diagonal wipe
- [ ] Drive collage drift
- [ ] Reduced motion and no-JS versions

## 5. Checks
- [ ] check.mjs 1440/768/390 + reduced motion, motion.mjs gpu/nogpu, scan-theme, phpcs
- [ ] Look at every screenshot; at most 3 rounds of fixes
