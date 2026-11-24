<?php
/**
 * Theme supports and menus.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Theme supports and menus.
 */
function msport_setup() {
	load_theme_textdomain( 'msport', MSPORT_DIR . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'caption', 'style', 'script', 'navigation-widgets' ) );
	add_theme_support( 'responsive-embeds' );

	register_nav_menus(
		array(
			'menu-1' => esc_html__( 'Primary', 'msport' ),
			'footer' => esc_html__( 'Footer', 'msport' ),
		)
	);

	// Image roles (DESIGN.md → Imagery, docs/CONTENT-MODEL.md → Image sizes).
	add_image_size( 'msport-wide', 2560, 0, false );
	add_image_size( 'msport-panel', 1200, 800, true );
	add_image_size( 'msport-tall', 1200, 1500, true );
}
add_action( 'after_setup_theme', 'msport_setup' );

/**
 * Names of the image sizes in the media picker.
 *
 * @param array $sizes Size names.
 * @return array
 */
function msport_image_size_names( $sizes ) {
	$sizes['msport-wide']  = __( 'Wide (2560 px)', 'msport' );
	$sizes['msport-panel'] = __( 'Panel 3:2', 'msport' );
	$sizes['msport-tall']  = __( 'Tall 4:5', 'msport' );
	return $sizes;
}
add_filter( 'image_size_names_choose', 'msport_image_size_names' );

/**
 * Large cut-outs keep their full width: no "-scaled" copy below 2560 px.
 *
 * @return int
 */
function msport_big_image_threshold() {
	return 4096;
}
add_filter( 'big_image_size_threshold', 'msport_big_image_threshold' );
