<?php
/**
 * Building blocks of the chapter templates: stepped headings, images, figures, the V10 recording.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * A heading from a textarea: every line becomes a span (the lines are stepped in CSS and revealed by a mask).
 *
 * @param string $text Raw field value, one line per heading line.
 * @return string HTML (escaped).
 */
function msport_lines( $text ) {
	$lines = array_values( array_filter( array_map( 'trim', preg_split( '/\R/', (string) $text ) ), 'strlen' ) );
	$html  = '';
	foreach ( $lines as $i => $line ) {
		$html .= sprintf( '<span class="line" style="--i:%d"><span class="line__in">%s</span></span>', (int) $i, esc_html( $line ) );
	}
	return $html;
}

/**
 * Plain text from a textarea as paragraphs: a blank line starts a new paragraph, the text is escaped.
 *
 * @param string $text Raw field value.
 * @return string HTML.
 */
function msport_paragraphs( $text ) {
	$parts = array_filter( array_map( 'trim', preg_split( '/\R\s*\R/', (string) $text ) ), 'strlen' );
	return implode( '', array_map( static fn( $p ) => '<p>' . nl2br( esc_html( $p ) ) . '</p>', $parts ) );
}

/**
 * An attachment image with the theme's defaults (lazy unless it is the LCP image).
 *
 * @param int    $id    Attachment ID.
 * @param string $size  Image size.
 * @param array  $attrs Extra attributes (class, sizes, loading, fetchpriority…).
 * @return string HTML or ''.
 */
function msport_image( $id, $size = 'msport-wide', $attrs = array() ) {
	$id = (int) $id;
	if ( ! $id ) {
		return '';
	}
	$attrs = wp_parse_args(
		$attrs,
		array(
			'loading'  => 'lazy',
			'decoding' => 'async',
			'sizes'    => '100vw',
		)
	);
	if ( 'eager' === $attrs['loading'] ) {
		$attrs['fetchpriority'] = 'high';
	}
	return (string) wp_get_attachment_image( $id, $size, false, $attrs );
}

/**
 * Whether an image is a cut-out (has an alpha channel): cut-outs are shown whole (contain), photos fill their frame.
 * Reads the file header only (PNG colour type, WebP VP8X alpha flag).
 *
 * @param int $id Attachment ID.
 * @return bool
 */
function msport_is_cutout( $id ) {
	static $cache = array();
	$id           = (int) $id;
	if ( ! $id ) {
		return false;
	}
	if ( ! isset( $cache[ $id ] ) ) {
		$file = get_attached_file( $id );
		$head = ( $file && is_readable( $file ) ) ? (string) file_get_contents( $file, false, null, 0, 32 ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file header.

		$png  = 0 === strpos( $head, "\x89PNG" ) && strlen( $head ) > 25 && in_array( ord( $head[25] ), array( 4, 6 ), true );
		$webp = 'RIFF' === substr( $head, 0, 4 ) && 'WEBP' === substr( $head, 8, 4 ) && 'VP8X' === substr( $head, 12, 4 ) && ( ord( $head[20] ) & 0x10 );

		$cache[ $id ] = $png || $webp;
	}
	return $cache[ $id ];
}

/**
 * Print an attachment image (see msport_image()); wp_get_attachment_image() escapes its output.
 *
 * @param int    $id    Attachment ID.
 * @param string $size  Image size.
 * @param array  $attrs Extra attributes.
 */
function msport_the_image( $id, $size = 'msport-wide', $attrs = array() ) {
	echo msport_image( $id, $size, $attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image().
}

/**
 * A caption "Name, 1983" set as a large year and the name; any other caption is printed as is.
 *
 * @param string $caption Raw caption.
 * @return string HTML (escaped).
 */
function msport_year_caption( $caption ) {
	$caption = trim( (string) $caption );
	if ( preg_match( '/^(.*?),\s*(\d{4})$/u', $caption, $m ) ) {
		return sprintf( '<span class="heritage__year">%s</span><span class="heritage__name">%s</span>', esc_html( $m[2] ), esc_html( $m[1] ) );
	}
	return esc_html( $caption );
}

/**
 * A number formatted for the page: thousands separator, decimals only when present.
 *
 * @param mixed $value Number or numeric string.
 * @return string
 */
function msport_number( $value ) {
	if ( ! is_numeric( $value ) ) {
		return (string) $value;
	}
	$value    = (float) $value;
	$decimals = floor( $value ) === $value ? 0 : min( 2, strlen( rtrim( substr( strrchr( (string) $value, '.' ), 1 ), '0' ) ) );
	return number_format_i18n( $value, $decimals );
}

/**
 * URL of the V10 recording: the file from M6 Settings, or the one shipped with the theme.
 *
 * @return string
 */
function msport_sound_url() {
	$id  = (int) msport_option( 'opt_sound_file', 0 );
	$url = $id ? wp_get_attachment_url( $id ) : '';
	if ( ! $url && file_exists( MSPORT_DIR . '/assets/audio/m6-v10.mp3' ) ) {
		$url = MSPORT_URI . '/assets/audio/m6-v10.mp3';
	}
	return (string) $url;
}

/**
 * The anchor of a chapter, from its field or the default.
 *
 * @param string $prefix  Chapter prefix.
 * @param string $fallback Default anchor.
 * @return string
 */
function msport_anchor( $prefix, $fallback ) {
	$anchor = sanitize_title( (string) msport_front( $prefix . '_anchor', $fallback ) );
	return $anchor ? $anchor : $fallback;
}
