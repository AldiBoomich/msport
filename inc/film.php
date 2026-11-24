<?php
/**
 * The 3D film on the front page (DESIGN.md → Motion → How the 3D film works).
 *
 * - An inline script in <head> adds the `film` class before the first paint when the visitor can get the
 *   film (no reduced motion, no Save-Data): chapters become tall scroll zones with a pinned frame, so nothing
 *   jumps later. Without it the page is the plain static version.
 * - assets/js/film/boot.js (script module, built by tools/build) runs Lenis and the scroll → camera mapping,
 *   and loads the live Three.js scene on every screen (no video: user's decision, 2026-11-24) behind a
 *   preloader (msport_film_loader()); where the scene cannot run, the preloader goes and the stills stay.
 * - Settings for the scene are printed as JSON (#msport-film-data).
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
 * Early head: switch the layout to film mode before the first paint, and show the preloader
 * (`film-loading`) until boot.js has the scene or gives up; 15 s at most, should the module never run.
 */
function msport_film_head() {
	if ( ! msport_film_enabled() ) {
		return;
	}
	wp_print_inline_script_tag(
		"(function(d){var c=navigator.connection;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!(c&&c.saveData)){d.classList.add('film','film-loading');setTimeout(function(){d.classList.remove('film-loading');},15000);}})(document.documentElement);"
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
 * The preloader: covers the page while the 3D scene loads (shown by the `film-loading` class only, so
 * reduced motion, Save-Data and no-JS visitors never see it). The rev gauge runs 0 → redline with the
 * download (boot.js → createGauge).
 */
function msport_film_loader() {
	if ( ! msport_film_enabled() ) {
		return;
	}
	$redline = 8250;
	?>
	<div class="film-loader" data-film-loader data-max="<?php echo esc_attr( $redline ); ?>" role="status" aria-live="polite">
		<div class="film-loader__inner">
			<p class="film-loader__mark"><?php echo esc_html( msport_option( 'opt_wordmark', __( 'M6 E63', 'msport' ) ) ); ?></p>
			<p class="film-loader__rpm" aria-hidden="true"><span data-film-loader-rpm>0</span> <span class="film-loader__unit"><?php echo esc_html_x( 'rpm', 'preloader gauge unit', 'msport' ); ?></span></p>
			<div class="film-loader__gauge" aria-hidden="true">
				<span class="film-loader__bar" data-film-loader-bar></span>
				<span class="film-loader__red"></span>
			</div>
			<span class="screen-reader-text"><?php esc_html_e( 'Loading the 3D film', 'msport' ); ?></span>
		</div>
	</div>
	<?php
}
add_action( 'wp_body_open', 'msport_film_loader' );

/**
 * Scene settings for boot.js: model, environment, textures and the look fields of the "3D scene" tab
 * (paint colour, gloss, driving speed).
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
	);

	// Trial versions for the user's side-by-side (boot.js → ?film=live | video | frames). The heavy Cycles
	// files sit in uploads/msport-film/ (outside the theme repository): video = cycles-pack.mjs CRF 20
	// (`reverse`: the film backwards, --reverse; `frozen`: the v7 film, its legs frozen-time flights from
	// bl_film.py --legs), frames = tools/3d/frames-pack.mjs WebP q82.
	$up             = trailingslashit( wp_upload_dir( null, false )['baseurl'] ) . 'msport-film/';
	$data['v6']     = array(
		'model'       => $base . 'm6-e63-v6.glb',
		'modelMobile' => $base . 'm6-e63-v6-mobile.glb',
		'skyBand'     => $base . 'env/shanghai-bund-band-12k',
	);
	$data['video']  = array(
		'land' => array(
			'film'    => $up . 'video/film-1080.mp4',
			'reverse' => $up . 'video/film-1080-reverse.mp4',
			'frozen'  => $up . 'video/film-1080-frozen.mp4',
			'loops'   => $up . 'video/film-1080-loops.mp4',
		),
		'port' => array(
			'film'    => $up . 'video/film-portrait.mp4',
			'reverse' => $up . 'video/film-portrait-reverse.mp4',
			'frozen'  => $up . 'video/film-portrait-frozen.mp4',
			'loops'   => $up . 'video/film-portrait-loops.mp4',
		),
	);
	$data['frames'] = array(
		'land' => $up . 'land/',
		'port' => $up . 'port/',
	);
	printf(
		'<script type="application/json" id="msport-film-data">%s</script>' . "\n",
		wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON, tags hex-escaped.
	);
}
add_action( 'wp_footer', 'msport_film_data', 5 );

/**
 * The look fields, validated; a field left empty is not sent, so the scene keeps its default look.
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
