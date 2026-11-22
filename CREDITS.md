# Credits and licences

Every third-party file in this theme is listed here before it is committed. If a row is empty, the asset is not in the theme yet.

## Fonts
| Font | Author / foundry | Licence | Source | Files |
|---|---|---|---|---|
| Archivo (variable, wdth + wght), subset Latin + Latin Ext to woff2 with fontTools | Omnibus-Type | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/archivo | `assets/fonts/archivo-var.woff2` |

## Photographs
| File | Subject | Author | Licence | Source URL |
|---|---|---|---|---|
| | | | | |

## Video
| File | Subject | Author | Licence | Source URL |
|---|---|---|---|---|
| | | | | |

## Site icon
| File | Subject | Source |
|---|---|---|
| `assets/images/site-icon.png` | BMW roundel, 512 px, transparent outside the circle (also set as the Site Icon in the media library) | file supplied by the user (2026-11-22) |

## Sound
| File | Subject | Author | Licence | Source URL | Attribution required |
|---|---|---|---|---|---|
| `assets/audio/m6-v10.mp3` | BMW M6 E63 V10, tunnel acceleration with two upshifts (13.7 s, processed with `tools/audio/process-v10.sh`) | YouTube video "Bmw e63 m6 tunnel exhaust sound" | | https://www.youtube.com/watch?v=1cBZ7SzsyX0 | |

## 3D models
| File | Subject | Author | Licence | Source URL |
|---|---|---|---|---|
| `assets/3d/m6-e63.glb` | BMW M6 (E63) | Mona x Supercars (Sketchfab: Car2022) | CC BY 4.0. Changes made: duplicate faces removed, surfaces subdivided and smoothed, wheels separated, rescaled, recoloured to Black Sapphire in code, compressed | https://sketchfab.com/3d-models/bmw-m6-e63-af2c44c1a844442ab66b7512aa791b4e |
| `assets/3d/m6-e63-v2.glb` | BMW M6 (E63), same model + baked ambient occlusion (`tools/3d/bl_bake_ao.py`) | Mona x Supercars (Sketchfab: Car2022) | CC BY 4.0. Changes made: as above, plus per-vertex ambient occlusion; tyre tread, sidewall, brake discs and calipers are replaced in code (`tools/3d/wheel-detail.js`) | https://sketchfab.com/3d-models/bmw-m6-e63-af2c44c1a844442ab66b7512aa791b4e |
| `assets/3d/m6-e63-v3.glb` (the model the site loads) | BMW M6 (E63), same model, v3 | Mona x Supercars (Sketchfab: Car2022) | CC BY 4.0. Changes made: as above, plus body design lines creased and panels faired, grille slats, angel-eye rings, red tail-lamp glass | https://sketchfab.com/3d-models/bmw-m6-e63-af2c44c1a844442ab66b7512aa791b4e |
| `assets/3d/textures/car-shadow.png` | Ground contact shadow under the car, baked in Blender from the model above | this project | — | — |

Note: the model has no origin notes on Sketchfab. Its Spanish material names and SketchUp structure suggest it may be based on an older model; if its origin turns out to be a game rip, replace it before any commercial use.

## HDRI and textures
| File | Subject | Author | Licence | Source URL |
|---|---|---|---|---|
| `assets/3d/env/neuer_zollhof_1k.hdr` | Neuer Zollhof, night city HDRI (main reflections) | Poly Haven | CC0 | https://polyhaven.com/a/neuer_zollhof |
| `3d-source/hdri/shanghai_bund_4k.hdr` (outside the theme; packed for the site as `assets/3d/env/shanghai-bund-4k-*.webp` and `-2k-*` by `tools/3d/hdr-pack.mjs`) | Shanghai Bund, night city HDRI (the paint's reflections, `tools/3d/car-env.js`) | Poly Haven | CC0 | https://polyhaven.com/a/shanghai_bund |
| `assets/3d/env/street_lamp_1k.hdr` (tried, no longer in the theme) | Street Lamp, night HDRI (alternative) | Poly Haven | CC0 | https://polyhaven.com/a/street_lamp |
| `assets/3d/textures/asphalt_track_*_1k.jpg` (diff, nor_gl, rough) | Asphalt Track texture | Poly Haven | CC0 | https://polyhaven.com/a/asphalt_track |
| (no file) | paint flakes: procedural in the paint shader (`tools/3d/car-shading.js`) | this project | — | — |

## Libraries
| Library | Version | Licence | Source |
|---|---|---|---|
| Lenis | 1.3.27 | MIT | github.com/darkroomengineering/lenis |
| Three.js (+ GLTFLoader, Meshopt decoder, EffectComposer passes, FXAA) | 0.170.0 | MIT | threejs.org |
| esbuild (build only, not shipped) | 0.28.2 | MIT | esbuild.github.io |
| `_s` starter theme | | GPL-2.0-or-later | underscores.me |
