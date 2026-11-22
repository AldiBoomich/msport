<?php
/**
 * The 3D film on the front page (DESIGN.md → Motion → How the 3D film works).
 *
 * - An inline script in <head> adds the `film` class before the first paint when the visitor can get the
 *   film (no reduced motion, no Save-Data): chapters become tall scroll zones with a pinned frame, so nothing
 *   jumps later. Without it the page is the plain static version.
 * - assets/js/film/boot.js (script module, built by tools/build) runs Lenis and the scroll → camera mapping,
 *   and after the hero still has painted loads either the live Three.js scene or, on phones and on
 *   computers whose graphics cannot hold it at full quality, the same film pre-rendered as video.
 * - Settings for the scene and the video files are printed as JSON (#msport-film-data).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether this request gets the film at all ("3D and scroll effects" in M6 Settings, front page only).
 *
 * @return bool
 */
function msport_film_enabled() {
	if ( ! is_front_page() ) {
		return false;
	}
	$on = function_exists( 'get_field' ) ? get_field( 'opt_effects_enabled', 'option' ) : null;
	return null === $on ? true : (bool) $on;
}

/**
 * Early head: switch the layout to film mode before the first paint.
 */
function msport_film_head() {
	if ( ! msport_film_enabled() ) {
		return;
	}
	wp_print_inline_script_tag(
		"(function(d){var c=navigator.connection;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!(c&&c.saveData)){d.classList.add('film');}})(document.documentElement);"
	);
}
add_action( 'wp_head', 'msport_film_head', 2 );

/**
 * Enqueue the film module.
 */
function msport_film_enqueue() {
	if ( ! msport_film_enabled() || ! function_exists( 'wp_enqueue_script_module' ) ) {
		return;
	}
	wp_enqueue_script_module( 'msport-film', MSPORT_URI . '/assets/js/film/boot.js', array(), msport_asset_version( 'assets/js/film/boot.js' ) );
}
add_action( 'wp_enqueue_scripts', 'msport_film_enqueue' );

/**
 * URL of a file field (attachment ID), or the fallback.
 *
 * @param string $name     Front page field name.
 * @param string $fallback Fallback URL.
 * @return string
 */
function msport_film_file( $name, $fallback ) {
	$id  = (int) msport_front( $name, 0 );
	$url = $id ? wp_get_attachment_url( $id ) : '';
	return $url ? $url : $fallback;
}

/**
 * URL of a pre-rendered video in assets/video/ with its file time as the version, so a re-render reaches
 * browsers that cached the old file.
 *
 * @param string $file File name in assets/video/.
 * @return string
 */
function msport_film_video( $file ) {
	$path = MSPORT_DIR . '/assets/video/' . $file;
	$url  = MSPORT_URI . '/assets/video/' . $file;
	return file_exists( $path ) ? add_query_arg( 'ver', filemtime( $path ), $url ) : $url;
}

/**
 * Scene settings for boot.js: model, environment, textures, the look fields of the "3D scene" tab (paint
 * colour, gloss, driving speed: live scene only) and the pre-rendered film (tools/3d/video.mjs →
 * video-pack.mjs): `film` is scrubbed by the scroll, `loops` holds the idle loops.
 */
function msport_film_data() {
	if ( ! msport_film_enabled() ) {
		return;
	}
	$base  = MSPORT_URI . '/assets/3d/';
	$model = msport_film_file( 'scene_model', $base . 'm6-e63-v3.glb' );
	$data  = array(
		'model'       => $model,
		'modelMobile' => msport_film_file( 'scene_model_mobile', $model ),
		'sky'         => $base . 'env/shanghai-bund-4k',
		'skyMobile'   => $base . 'env/shanghai-bund-2k',
		'shadow'      => $base . 'textures/car-shadow.png',
		'asphalt'     => array(
			'diff'  => $base . 'textures/asphalt_track_diff_1k.jpg',
			'nor'   => $base . 'textures/asphalt_track_nor_gl_1k.jpg',
			'rough' => $base . 'textures/asphalt_track_rough_1k.jpg',
		),
		'look'        => msport_film_look(),
		'video'       => array(
			'land' => array(
				'film'  => msport_film_video( 'film-900.mp4' ),
				'loops' => msport_film_video( 'film-900-loops.mp4' ),
			),
			'port' => array(
				'film'  => msport_film_video( 'film-portrait.mp4' ),
				'loops' => msport_film_video( 'film-portrait-loops.mp4' ),
			),
		),
	);
	printf(
		'<script type="application/json" id="msport-film-data">%s</script>' . "\n",
		wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON, tags hex-escaped.
	);
}
add_action( 'wp_footer', 'msport_film_data', 5 );

/**
 * The look fields, validated; a field left empty is not sent, so the scene keeps the look the stills and
 * the video were rendered with.
 *
 * @return array{paint?: string, gloss?: float, speed?: float}
 */
function msport_film_look() {
	$look  = array();
	$paint = sanitize_hex_color( (string) msport_front( 'scene_paint', '' ) );
	if ( $paint ) {
		$look['paint'] = $paint;
	}
	$gloss = msport_front( 'scene_clearcoat_roughness', '' );
	if ( is_numeric( $gloss ) ) {
		$look['gloss'] = min( 0.2, max( 0, (float) $gloss ) );
	}
	$speed = msport_front( 'scene_speed', '' );
	if ( is_numeric( $speed ) ) {
		$look['speed'] = min( 2, max( 0.5, (float) $speed ) );
	}
	return $look;
}
