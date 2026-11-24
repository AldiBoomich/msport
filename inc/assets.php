<?php
/**
 * Styles, the script module and the font preload. No jQuery; all scripts are deferred modules.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue the theme CSS and the front-end module (assets/js/main.js imports the rest).
 */
function msport_enqueue_assets() {
	wp_enqueue_style( 'msport-main', MSPORT_URI . '/assets/css/main.css', array(), msport_asset_version( 'assets/css/main.css' ) );

	if ( function_exists( 'wp_enqueue_script_module' ) ) {
		wp_enqueue_script_module( 'msport-main', MSPORT_URI . '/assets/js/main.js', array(), msport_asset_version( 'assets/js/main.js' ) );
	}
}
add_action( 'wp_enqueue_scripts', 'msport_enqueue_assets' );

/**
 * Early head: no-js → js class switch (and the reduced-motion flag), font preload, theme colour.
 */
function msport_head_early() {
	wp_print_inline_script_tag( "document.documentElement.classList.replace('no-js','js');" );
	printf(
		'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
		esc_url( MSPORT_URI . '/assets/fonts/mona-sans-vf.woff2' )
	);
	echo '<meta name="theme-color" content="#16181B">' . "\n";
}
add_action( 'wp_head', 'msport_head_early', 1 );
