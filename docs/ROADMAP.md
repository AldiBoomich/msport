# Roadmap

Plan approved 2026-11-24. References: Porsche 911 Turbo S, Ferrari 812 GTS, Koenigsegg (see DESIGN.md → Direction).

## 0. Reset
- [x] Remove the 3D film and the old design (2026-11-24)

## 1. Documents
- [x] Study the references in the browser (scroll, click, frame-by-frame)
- [x] DESIGN.md (palette with measured contrast, Mona Sans, motion, signature POWER)
- [x] CONTENT-MODEL.md, CREDITS.md, CLAUDE.md
- [ ] User approves palette and font (preview page)

## 2. Photos
- [ ] Download candidates (BMW Newsroom M6 Convertible 2006 set, M5 engine, M635CSi; Commons E63 coupé)
- [ ] Choose ~14, cut out the coupé shots (rembg), one grade, sizes
- [ ] User approves the photo sheet
- [ ] Verify all figures (power, torque, 0–100, weight, dimensions, brakes) against a reliable source

## 3. Skeleton (static, complete without JS)
- [ ] Tokens, font, header, footer, chapter rail
- [ ] ACF field groups + options page
- [ ] 8 chapters (hero, profile, design, power, drive, specs, heritage, outro)
- [ ] Content import (media + fields) through a one-off mu-plugin
- [ ] Restore the V10 recording and the tachometer from git history (d4c5686)

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
