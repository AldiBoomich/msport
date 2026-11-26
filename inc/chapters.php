<?php
/**
 * The chapters of the front page, in order (DESIGN.md → Page structure).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Chapter list: prefix (field prefix and template name), default anchor, tone (night / day), default rail name.
 *
 * @return array[]
 */
function msport_chapter_defaults() {
	return array(
		array( 'hero', 'top', 'night', __( 'Start', 'msport' ) ),
		array( 'profile', 'profile', 'night', __( 'Profile', 'msport' ) ),
		array( 'design', 'design', 'day', __( 'Design', 'msport' ) ),
		array( 'power', 'power', 'night', __( 'V10', 'msport' ) ),
		array( 'drive', 'drive', 'day', __( 'Drive', 'msport' ) ),
		array( 'film', 'film', 'night', __( 'Film', 'msport' ) ),
		array( 'specs', 'specs', 'night', __( 'Spec sheet', 'msport' ) ),
		array( 'heritage', 'heritage', 'day', __( 'Heritage', 'msport' ) ),
		array( 'outro', 'contact', 'night', __( 'Contact', 'msport' ) ),
	);
}

/**
 * The chapters shown on the page, with their current anchor and rail name.
 *
 * @return array[] Each: prefix, anchor, tone, nav.
 */
function msport_chapters() {
	static $list = null;
	if ( null !== $list ) {
		return $list;
	}
	$list = array();
	foreach ( msport_chapter_defaults() as list( $prefix, $anchor, $tone, $nav ) ) {
		if ( ! msport_front_flag( $prefix . '_show' ) ) {
			continue;
		}
		$list[] = array(
			'prefix' => $prefix,
			'anchor' => msport_anchor( $prefix, $anchor ),
			'tone'   => $tone,
			'nav'    => (string) msport_front( $prefix . '_nav', $nav ),
		);
	}
	return $list;
}

/**
 * Anchor of a chapter by prefix ("#power"), for buttons that jump to it.
 *
 * @param string $prefix Chapter prefix.
 * @return string URL fragment or home URL with fragment.
 */
function msport_chapter_url( $prefix ) {
	foreach ( msport_chapter_defaults() as list( $p, $anchor ) ) {
		if ( $p === $prefix ) {
			$id = msport_anchor( $prefix, $anchor );
			return is_front_page() ? '#' . $id : home_url( '/#' . $id );
		}
	}
	return home_url( '/' );
}
