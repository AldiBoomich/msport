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
}
add_action( 'after_setup_theme', 'msport_setup' );
