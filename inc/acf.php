<?php
/**
 * Custom fields (Secure Custom Fields or ACF PRO, same API): Local JSON and the options page.
 *
 * Field groups are saved to and loaded from acf-json/ in the theme,
 * so they travel with the code. After a deploy: Field Groups → Sync.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Save field groups into the theme.
 *
 * @return string
 */
function msport_acf_json_save_point() {
	return MSPORT_DIR . '/acf-json';
}
add_filter( 'acf/settings/save_json', 'msport_acf_json_save_point' );

/**
 * Load field groups from the theme.
 *
 * @param array $paths Load paths.
 * @return array
 */
function msport_acf_json_load_point( $paths ) {
	$paths[] = MSPORT_DIR . '/acf-json';
	return $paths;
}
add_filter( 'acf/settings/load_json', 'msport_acf_json_load_point' );

/**
 * Options page "M6 Settings" (docs/CONTENT-MODEL.md, section 1).
 */
function msport_options_page() {
	if ( ! function_exists( 'acf_add_options_page' ) ) {
		return;
	}
	acf_add_options_page(
		array(
			'page_title' => __( 'M6 Settings', 'msport' ),
			'menu_title' => __( 'M6 Settings', 'msport' ),
			'menu_slug'  => 'msport-settings',
			'capability' => 'manage_options',
			'icon_url'   => 'dashicons-performance',
			'position'   => 59,
			'redirect'   => false,
		)
	);
}
add_action( 'acf/init', 'msport_options_page' );

/**
 * The front page is edited with fields only: hide the block editor there.
 */
function msport_hide_editor_on_front_page() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- reads the edited post ID only.
	$post_id  = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
	$front_id = (int) get_option( 'page_on_front' );
	if ( $post_id && $post_id === $front_id ) {
		remove_post_type_support( 'page', 'editor' );
	}
}
add_action( 'admin_init', 'msport_hide_editor_on_front_page' );

/**
 * Admin notice when no field plugin is active.
 */
function msport_fields_plugin_notice() {
	if ( function_exists( 'get_field' ) || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	echo '<div class="notice notice-warning"><p>' . esc_html__( 'M6 E63 Redline: activate ACF PRO (or the free Secure Custom Fields). Without it the page shows default texts only.', 'msport' ) . '</p></div>';
}
add_action( 'admin_notices', 'msport_fields_plugin_notice' );
