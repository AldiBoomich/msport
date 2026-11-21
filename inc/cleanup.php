<?php
/**
 * Removes what a one-page site does not use: emoji, comments, pings, feeds, head clutter.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Head clutter and emoji.
 */
function msport_cleanup_head() {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );

	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	remove_action( 'wp_head', 'feed_links', 2 );
	remove_action( 'wp_head', 'feed_links_extra', 3 );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
	remove_action( 'wp_head', 'wp_oembed_add_host_js' );
}
add_action( 'init', 'msport_cleanup_head' );

/**
 * No emoji DNS prefetch.
 *
 * @param array  $urls          URLs.
 * @param string $relation_type Hint type.
 * @return array
 */
function msport_resource_hints( $urls, $relation_type ) {
	if ( 'dns-prefetch' === $relation_type ) {
		$urls = array_filter(
			$urls,
			static function ( $url ) {
				return ! is_string( $url ) || false === strpos( $url, 's.w.org' );
			}
		);
	}
	return $urls;
}
add_filter( 'wp_resource_hints', 'msport_resource_hints', 10, 2 );

/**
 * The front end never needs jquery-migrate (and the theme never asks for jQuery).
 *
 * @param WP_Scripts $scripts Script registry.
 */
function msport_drop_jquery_migrate( $scripts ) {
	if ( is_admin() || empty( $scripts->registered['jquery'] ) ) {
		return;
	}
	$scripts->registered['jquery']->deps = array_diff( $scripts->registered['jquery']->deps, array( 'jquery-migrate' ) );
}
add_action( 'wp_default_scripts', 'msport_drop_jquery_migrate' );

/**
 * Block styles are only needed on pages with editor content, not on the front page (fields only).
 */
function msport_dequeue_block_styles() {
	if ( is_front_page() ) {
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'wp-block-library-theme' );
		wp_dequeue_style( 'classic-theme-styles' );
		wp_dequeue_style( 'global-styles' );
	}
}
add_action( 'wp_enqueue_scripts', 'msport_dequeue_block_styles', 100 );

/**
 * Global styles (block presets) are printed by their own hooks; skip them on the front page too.
 */
function msport_skip_global_styles_on_front() {
	if ( is_front_page() ) {
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
		remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
	}
}
add_action( 'template_redirect', 'msport_skip_global_styles_on_front' );

/*
 * Comments and pings: the site has no blog.
 */

/**
 * Remove comment support from every post type.
 */
function msport_disable_comment_support() {
	foreach ( get_post_types() as $post_type ) {
		if ( post_type_supports( $post_type, 'comments' ) ) {
			remove_post_type_support( $post_type, 'comments' );
			remove_post_type_support( $post_type, 'trackbacks' );
		}
	}
}
add_action( 'init', 'msport_disable_comment_support', 100 );

add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
add_filter( 'comments_array', '__return_empty_array', 10 );
add_filter( 'xmlrpc_enabled', '__return_false' );

/**
 * No X-Pingback header.
 *
 * @param array $headers HTTP headers.
 * @return array
 */
function msport_remove_pingback_header( $headers ) {
	unset( $headers['X-Pingback'] );
	return $headers;
}
add_filter( 'wp_headers', 'msport_remove_pingback_header' );

/**
 * Hide the Comments screen in the admin.
 */
function msport_remove_comments_menu() {
	remove_menu_page( 'edit-comments.php' );
}
add_action( 'admin_menu', 'msport_remove_comments_menu' );

/**
 * Hide the comments bubble in the admin bar.
 *
 * @param WP_Admin_Bar $bar Admin bar.
 */
function msport_remove_comments_admin_bar( $bar ) {
	$bar->remove_node( 'comments' );
}
add_action( 'admin_bar_menu', 'msport_remove_comments_admin_bar', 999 );
