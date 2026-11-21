# msport: M6 E63 “Redline”

A single-page WordPress theme that presents the BMW M6 E63 (2005–2010) through its high-revving V10.
Built as a portfolio piece: dark, technical design, the whole page is one real-time 3D film of the black E63 driving at night, the scroll moves the camera from detail to detail, and every word and image is editable in the admin through ACF Pro.

## Features
- One-page front page in 10 chapters over one 3D scene: Hero, Nose and lights, V10 / Rev (scroll-driven tachometer to 8,250 rpm), Wheels and brakes, Gills, Carbon roof, Tail and sound, SMG III, Spec sheet, Final shot.
- All content in ACF Pro fields with instructions for editors; global settings in **M6 Settings**.
- Field groups saved as ACF Local JSON (`acf-json/`).
- Lenis smooth scroll and a single Three.js canvas behind the page, all self-hosted; the scroll position drives the camera (no GSAP needed). Three.js loads after the first paint and lowers its own resolution on weak graphics.
- 3D car paint colour, gloss and driving speed are editable in the admin.
- Full reduced-motion version and a static fallback for devices without GPU acceleration.
- Self-hosted fonts, no external requests.
- Accessible: one `<h1>`, keyboard navigation, visible focus, AA contrast.

Design system: [DESIGN.md](DESIGN.md). Field map: [docs/CONTENT-MODEL.md](docs/CONTENT-MODEL.md). Licences: [CREDITS.md](CREDITS.md).

## Requirements
- WordPress 6.5+
- PHP 8.2+
- **Advanced Custom Fields PRO** 6.x (required: Repeater and Options Page)

## Installation
1. Copy the `msport` folder to `wp-content/themes/` and activate the theme.
2. Install and activate ACF PRO (or the free Secure Custom Fields).
3. Go to **ACF → Field Groups** and click **Sync** for all groups.
4. Create a page called "Home", then set it in **Settings → Reading → Your homepage displays → A static page**.
5. Build the menu in **Appearance → Menus** with Custom Links to section anchors (`#rev`, `#wheels`, `#sound`, `#smg`, `#specs`, `#contact`) and assign it to **Primary**.
6. **Settings → Permalinks → Save** once.

## Editing content
- **Pages → Home:** every chapter of the page, in order, one tab each. Each chapter can be hidden with *Show chapter*.
- **M6 Settings:** header wordmark and button, developer credit and link (also used by the "Get in touch" button of the last chapter), social links, V10 sound file, effects on/off, 404 texts.
- Stills: renders of each chapter's camera angle, used when 3D is off; upload in the size given in the field instructions and set the focal point if the crop cuts the car.

## Development
```sh
composer install
npm install
composer lint:wpcs   # PHP coding standards
composer lint:php    # PHP syntax
npm run lint:js
npm run lint:css
```

### The 3D film scripts
`assets/js/film/` is built, not edited: sources are `src/film/` (page side) and `tools/3d/*.js` (the scene, shared
with the test viewer `tools/3d/viewer.html`).
```sh
cd tools/build
npm install          # esbuild, Lenis, three.js 0.170.0 (the version the stills were rendered with)
npm run build        # → assets/js/film/boot.js + chunks/
```
The night city panorama is packed from the Poly Haven `.hdr` with `tools/3d/hdr-pack.mjs` (25 MB → ~1 MB WebP pair).

Based on the `_s` (Underscores) starter theme, GPL-2.0-or-later.
