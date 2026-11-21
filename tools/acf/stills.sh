#!/usr/bin/env bash
# Chapter stills: PNG renders (tools/3d/shot.mjs) → WebP → media library → front page fields.
# usage: bash stills.sh <folder with dNN.png / mNN.png> <ffmpeg> <wp command>
# dNN = landscape 2560×1440 (16:9), mNN = portrait 1200×2600 (9:19.5); render with shot.mjs at
# w=1280&h=720 and w=600&h=1300, SS=2.
set -euo pipefail
SRC="$1"; FF="$2"; WP="$3"
OUT="$SRC/webp"; mkdir -p "$OUT"

# chapter number | field prefix | slug | alt text
CHAPTERS=(
  "01|hero|hero|Black BMW M6 E63 driving at night on a wet road, the city skyline behind it"
  "02|front|nose-and-lights|Shark nose of the BMW M6 E63 with its angel-eye headlights on"
  "03|rev|v10|Bonnet of the BMW M6 E63 from above, almost in darkness"
  "04|wheels|wheels-and-brakes|Front wheel of the BMW M6 E63, the cross-drilled brake disc glowing after hard braking"
  "05|gills|gills|Front wing and side gill of the BMW M6 E63 catching a passing light"
  "06|roof|carbon-roof|Carbon-fibre roof of the BMW M6 E63 seen from above"
  "07|sound|tail-and-sound|Tail of the BMW M6 E63 with red lamps and four exhaust tips"
  "08|smg|smg|BMW M6 E63 in side profile, driving past the city at night"
  "10|outro|final-shot|BMW M6 E63 driving towards the camera with its headlights on"
)

for row in "${CHAPTERS[@]}"; do
  IFS='|' read -r n prefix slug alt <<< "$row"
  "$FF" -v error -y -i "$SRC/d$n.png" -c:v libwebp -quality 82 -compression_level 6 "$OUT/m6-e63-$slug.webp"
  "$FF" -v error -y -i "$SRC/m$n.png" -c:v libwebp -quality 82 -compression_level 6 "$OUT/m6-e63-$slug-mobile.webp"
  d=$($WP media import "$OUT/m6-e63-$slug.webp" --title="M6 E63: $slug" --alt="$alt" --porcelain)
  m=$($WP media import "$OUT/m6-e63-$slug-mobile.webp" --title="M6 E63: $slug (mobile)" --alt="$alt" --porcelain)
  $WP eval "\$f = (int) get_option( 'page_on_front' ); update_field( 'field_msport_${prefix}_still', $d, \$f ); update_field( 'field_msport_${prefix}_still_mobile', $m, \$f );"
  echo "$n $prefix: desktop $d, mobile $m"
done
