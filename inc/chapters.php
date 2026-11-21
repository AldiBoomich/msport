<?php
/**
 * The 10 chapters of the front page, in page order (DESIGN.md → Motion → Chapters).
 *
 * Text comes from fields with the chapter prefix ({prefix}_title, {prefix}_text, …),
 * see docs/CONTENT-MODEL.md. Camera keys and effects live in theme JS, keyed by the same prefix.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Chapter list.
 *
 * - prefix: field prefix and template name (template-parts/chapters/{prefix}.php, else template-parts/chapter.php).
 * - anchor: default anchor ID (editable per chapter in {prefix}_anchor).
 * - title:  fallback heading.
 * - kind:   "film" = full-viewport scroll zone over the 3D canvas; "panel" = normal-height section on a surface panel.
 *
 * @return array[]
 */
function msport_chapters() {
	return array(
		array(
			'prefix' => 'hero',
			'anchor' => 'top',
			'title'  => __( 'Ten cylinders. 8,250 rpm.', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'front',
			'anchor' => 'front',
			'title'  => __( 'Nose and lights', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'rev',
			'anchor' => 'rev',
			'title'  => __( 'The V10', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'wheels',
			'anchor' => 'wheels',
			'title'  => __( 'Wheels and brakes', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'gills',
			'anchor' => 'gills',
			'title'  => __( 'Gills', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'roof',
			'anchor' => 'roof',
			'title'  => __( 'Carbon roof', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'sound',
			'anchor' => 'sound',
			'title'  => __( 'Tail and sound', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'smg',
			'anchor' => 'smg',
			'title'  => __( 'SMG III', 'msport' ),
			'kind'   => 'film',
		),
		array(
			'prefix' => 'spec',
			'anchor' => 'specs',
			'title'  => __( 'Spec sheet', 'msport' ),
			'kind'   => 'panel',
		),
		array(
			'prefix' => 'outro',
			'anchor' => 'contact',
			'title'  => __( 'End of the run.', 'msport' ),
			'kind'   => 'film',
		),
	);
}
