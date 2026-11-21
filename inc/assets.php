<?php
/**
 * Styles, scripts and font preload. No jQuery, every script deferred.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue the theme CSS and JS.
 */
function msport_enqueue_assets() {
	wp_enqueue_style( 'msport-main', MSPORT_URI . '/assets/css/main.css', array(), msport_asset_version( 'assets/css/main.css' ) );

	wp_enqueue_script(
		'msport-header',
		MSPORT_URI . '/assets/js/header.js',
		array(),
		msport_asset_version( 'assets/js/header.js' ),
		array(
			'strategy'  => 'defer',
			'in_footer' => false,
		)
	);

	// The V10 sound buttons live on the front page only.
	if ( is_front_page() ) {
		wp_enqueue_script(
			'msport-sound',
			MSPORT_URI . '/assets/js/sound.js',
			array(),
			msport_asset_version( 'assets/js/sound.js' ),
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}
}
add_action( 'wp_enqueue_scripts', 'msport_enqueue_assets' );

/**
 * Early head: no-js → js class switch, font preload, theme colour.
 */
function msport_head_early() {
	wp_print_inline_script_tag( "document.documentElement.classList.replace('no-js','js');" );
	printf(
		'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
		esc_url( MSPORT_URI . '/assets/fonts/archivo-var.woff2' )
	);
	echo '<meta name="theme-color" content="#14171B">' . "\n";
}
add_action( 'wp_head', 'msport_head_early', 1 );
