# Content model

Everything visible comes from ACF PRO fields (Local JSON in `acf-json/`). Templates read them through `msport_front()` /
`msport_option()` with a translatable fallback. Images are stored as attachment IDs. **Never rename a field that has
content.**

## Front page (`group_msport_front`, one tab per chapter)
Every chapter has `<prefix>_show` (true/false, default on) and `<prefix>_anchor` (text, the `#id` used by the menu and
the chapter rail; default = prefix).

| Chapter | Fields |
|---|---|
| Hero `hero_` | `wordmark` (text, "M6"), `title` (textarea, one line per headline line; the only `<h1>`), `lead` (textarea), `cta_label` (text), `image` (image: car cut-out, 21:9, ≥ 2560px), `image_mobile` (image, 4:5, optional) |
| Profile `profile_` | `image` (image: side-profile cut-out, ≥ 2560px wide), `ghost` (text, "8250", decorative), `figures` (repeater: `value`, `unit`, `label`) |
| Design `design_` | `title` (textarea), `lead` (textarea), `image` (image: 3/4 cut-out), `hotspots` (repeater: `x` and `y` in % of the image, `label` (short, shown on hover), `title`, `text` (textarea), `image` (detail photo, 3:2)) |
| POWER `power_` | `title` (textarea), `lead` (textarea), `image` (engine photo), `specs` (repeater: `label`, `value`, `unit`), `from` (number, 400), `to` (number, 507), `unit` (text, "PS"), `mode_off` (text, "P400"), `mode_on` (text, "P500"), `button_label` (text, "POWER"), `hint` (text, shown before the first press), `idle` (number, rpm), `redline` (number, 8250), `scale_max` (number, 9000) |
| Drive `drive_` | `title` (textarea), `text` (textarea), `photos` (repeater: `image`, `caption`) — 3 or 4 rows |
| Spec sheet `specs_` | `title` (textarea), `tabs` (repeater: `label`, `image`, `rows` (repeater: `label`, `value`)) |
| Heritage `heritage_` | `title` (textarea), `text` (textarea), `then_image`, `then_caption`, `now_image`, `now_caption` |
| Outro `outro_` | `title` (textarea, one line per stepped line), `text` (textarea), `cta_label` (text; the link goes to the developer URL from M6 Settings) |

## M6 Settings (options page, prefix `opt_`)
| Field | Use |
|---|---|
| `opt_wordmark` | header wordmark ("M6") |
| `opt_header_cta_label` | header button ("Hear the V10") |
| `opt_menu_label`, `opt_close_label`, `opt_skip_label`, `opt_nav_label` | UI labels |
| `opt_dev_name`, `opt_dev_url` | developer credit and the outro link |
| `opt_sound_file` | V10 recording (file; falls back to `assets/audio/m6-v10.mp3`) |
| `opt_rpm_curve` | textarea, JSON `[[seconds, rpm], …]` for the POWER needle (built by `tools/audio/rpm-curve.mjs`) |
| `opt_credits` | textarea, photo and sound credits shown in the footer dialog |
| `opt_meta_description` | meta description |
| `opt_404_title`, `opt_404_text`, `opt_404_button` | 404 page |

## Image sizes
- `msport-wide` 2560 × auto (cut-outs and full-bleed photos)
- `msport-panel` 1200 × 800, crop (detail panel, 3:2)
- `msport-tall` 1200 × 1500, crop (collage 4:5, hero on phones)
