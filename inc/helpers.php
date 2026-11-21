<?php
/**
 * Small helpers used by the templates.
 *
 * Every visible value comes from a custom field (ACF or Secure Custom Fields).
 * These wrappers keep the templates working when the field plugin is off or a
 * field is still empty: the fallback is always a translatable default.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Field value with a fallback.
 *
 * @param string    $name     Field name.
 * @param int|false $post_id  Post ID, 'option' for the options page, false for the current post.
 * @param mixed     $fallback Value used when the field plugin is missing or the field is empty.
 * @return mixed
 */
function msport_field( $name, $post_id = false, $fallback = '' ) {
	if ( ! function_exists( 'get_field' ) ) {
		return $fallback;
	}
	$value = get_field( $name, $post_id );
	if ( null === $value || '' === $value || false === $value || array() === $value ) {
		return $fallback;
	}
	return $value;
}

/**
 * Value from the "M6 Settings" options page.
 *
 * @param string $name     Field name (prefix opt_).
 * @param mixed  $fallback Default value.
 * @return mixed
 */
function msport_option( $name, $fallback = '' ) {
	return msport_field( $name, 'option', $fallback );
}

/**
 * Value from the front page (chapter fields), usable on any template.
 *
 * @param string $name     Field name.
 * @param mixed  $fallback Default value.
 * @return mixed
 */
function msport_front( $name, $fallback = '' ) {
	$front_id = (int) get_option( 'page_on_front' );
	return msport_field( $name, $front_id ? $front_id : false, $fallback );
}

/**
 * True/false field that defaults to on (a missing toggle never hides a chapter).
 *
 * @param string $name Field name.
 * @return bool
 */
function msport_front_flag( $name ) {
	if ( ! function_exists( 'get_field' ) ) {
		return true;
	}
	$front_id = (int) get_option( 'page_on_front' );
	$value    = get_field( $name, $front_id ? $front_id : false );
	return null === $value ? true : (bool) $value;
}

/**
 * URL of an anchor on the front page: "#specs" on the front page, "/#specs" elsewhere.
 *
 * @param string $anchor Anchor ID without the hash.
 * @return string
 */
function msport_anchor_url( $anchor ) {
	$anchor = sanitize_title( $anchor );
	return is_front_page() ? '#' . $anchor : home_url( '/#' . $anchor );
}

/**
 * Cache-busting version for a theme file: file time while WP_DEBUG is on, theme version otherwise.
 *
 * @param string $relative Path inside the theme.
 * @return string
 */
function msport_asset_version( $relative ) {
	$file = MSPORT_DIR . '/' . ltrim( $relative, '/' );
	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && file_exists( $file ) ) {
		return (string) filemtime( $file );
	}
	return MSPORT_VERSION;
}

/**
 * Plain text from a textarea field as paragraphs: every line becomes one <p>, the text is escaped.
 *
 * @param string $text Raw field value.
 * @return string HTML.
 */
function msport_paragraphs( $text ) {
	$lines = array_filter( array_map( 'trim', preg_split( '/\R+/', (string) $text ) ) );
	return implode( '', array_map( static fn( $line ) => '<p>' . esc_html( $line ) . '</p>', $lines ) );
}
