<?php
/**
 * Theme supports, menus, image sizes, upload types.
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
			'menu-1' => esc_html__( 'Primary (anchor links to chapters)', 'msport' ),
			'footer' => esc_html__( 'Footer (privacy and other pages)', 'msport' ),
		)
	);

	// Chapter stills: 16:9 landscape, 9:19.5 portrait = the shape of a full-screen chapter, so the still
	// matches the live 3D frame (docs/CONTENT-MODEL.md, section 4).
	add_image_size( 'msport-still', 2560, 1440, true );
	add_image_size( 'msport-still-m', 1200, 2600, true );
}
add_action( 'after_setup_theme', 'msport_setup' );

/**
 * Width of the text column (DESIGN.md: 680 px), used by embeds.
 */
function msport_content_width() {
	$GLOBALS['content_width'] = 680;
}
add_action( 'after_setup_theme', 'msport_content_width', 0 );

/**
 * Names of the image sizes in the media picker.
 *
 * @param array $sizes Size names.
 * @return array
 */
function msport_image_size_names( $sizes ) {
	$sizes['msport-still']   = __( 'Chapter still, landscape (16:9)', 'msport' );
	$sizes['msport-still-m'] = __( 'Chapter still, portrait (9:19.5)', 'msport' );
	return $sizes;
}
add_filter( 'image_size_names_choose', 'msport_image_size_names' );

/**
 * Anchor links ("/#rev") point inside the front page: they are not the "current page".
 *
 * @param array $atts Link attributes.
 * @return array
 */
function msport_menu_anchor_attributes( $atts ) {
	if ( isset( $atts['href'] ) && false !== strpos( $atts['href'], '#' ) ) {
		unset( $atts['aria-current'] );
	}
	return $atts;
}
add_filter( 'nav_menu_link_attributes', 'msport_menu_anchor_attributes' );

/**
 * Same for the list item classes.
 *
 * @param string[] $classes CSS classes.
 * @param WP_Post  $item    Menu item.
 * @return string[]
 */
function msport_menu_anchor_classes( $classes, $item ) {
	if ( false !== strpos( (string) $item->url, '#' ) ) {
		$classes = array_diff( $classes, array( 'current-menu-item', 'current_page_item' ) );
	}
	return $classes;
}
add_filter( 'nav_menu_css_class', 'msport_menu_anchor_classes', 10, 2 );

/**
 * Administrators may upload the 3D scene files (.glb model, .hdr environment).
 *
 * @param array $mimes Allowed types.
 * @return array
 */
function msport_upload_mimes( $mimes ) {
	if ( current_user_can( 'manage_options' ) ) {
		$mimes['glb'] = 'model/gltf-binary';
		$mimes['hdr'] = 'image/vnd.radiance';
	}
	return $mimes;
}
add_filter( 'upload_mimes', 'msport_upload_mimes' );

/**
 * WordPress cannot sniff .glb / .hdr content types; trust the extension for administrators only.
 *
 * @param array  $data     Detected ext/type.
 * @param string $file     Full path.
 * @param string $filename File name.
 * @return array
 */
function msport_check_scene_filetype( $data, $file, $filename ) {
	if ( ! empty( $data['ext'] ) || ! current_user_can( 'manage_options' ) ) {
		return $data;
	}
	$ext   = strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );
	$types = array(
		'glb' => 'model/gltf-binary',
		'hdr' => 'image/vnd.radiance',
	);
	if ( isset( $types[ $ext ] ) ) {
		$data['ext']  = $ext;
		$data['type'] = $types[ $ext ];
	}
	return $data;
}
add_filter( 'wp_check_filetype_and_ext', 'msport_check_scene_filetype', 10, 3 );
