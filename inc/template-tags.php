<?php
/**
 * Building blocks of the chapter templates: stepped headings, images, figures, the tachometer, the V10 recording.
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
 * The tachometer (DESIGN.md → Components): scale 0 … max, red zone from the redline in amber, the needle at idle.
 * JS (power.js) turns the needle through the CSS variable --deg; without JS the needle stays at idle.
 *
 * @param int   $idle    Idle rpm.
 * @param int   $redline Start of the red zone, rpm.
 * @param int   $max     Scale end, rpm.
 * @param array $texts   Texts: scale, unit, title ({redline} becomes the number).
 * @return string SVG.
 */
function msport_tachometer( $idle, $redline, $max, $texts = array() ) {
	$texts = wp_parse_args(
		$texts,
		array(
			'scale' => __( '×1000 rpm', 'msport' ),
			'unit'  => __( 'rpm', 'msport' ),
			'title' => __( 'Tachometer with the red zone from {redline} rpm.', 'msport' ),
		)
	);

	$max     = max( 1000, (int) ( ceil( (int) $max / 1000 ) * 1000 ) );
	$redline = min( max( 0, (int) $redline ), $max );
	$idle    = min( max( 0, (int) $idle ), $max );
	$cx      = 200;
	$cy      = 200;
	$r       = 176;

	// Angle in degrees, clockwise from 12 o'clock: 0 rpm at -135°, max at +135°.
	$angle = static function ( $rpm ) use ( $max ) {
		return -135 + 270 * $rpm / $max;
	};
	$point = static function ( $deg, $radius ) use ( $cx, $cy ) {
		$a = deg2rad( $deg );
		return array( round( $cx + $radius * sin( $a ), 2 ), round( $cy - $radius * cos( $a ), 2 ) );
	};
	$arc   = static function ( $from, $to, $radius ) use ( $angle, $point ) {
		$a1 = $angle( $from );
		$a2 = $angle( $to );

		list( $x1, $y1 ) = $point( $a1, $radius );
		list( $x2, $y2 ) = $point( $a2, $radius );
		return sprintf( 'M%s %sA%s %s 0 %d 1 %s %s', $x1, $y1, $radius, $radius, ( $a2 - $a1 ) > 180 ? 1 : 0, $x2, $y2 );
	};

	$ticks  = '';
	$labels = '';
	for ( $rpm = 0; $rpm <= $max; $rpm += 250 ) {
		$major = 0 === $rpm % 1000;
		$deg   = $angle( $rpm );

		list( $x1, $y1 ) = $point( $deg, $r - 6 );
		list( $x2, $y2 ) = $point( $deg, $r - ( $major ? 26 : 14 ) );

		$ticks .= sprintf(
			'<line class="tacho__tick%s%s" x1="%s" y1="%s" x2="%s" y2="%s"/>',
			$major ? ' tacho__tick--major' : '',
			$rpm >= $redline ? ' tacho__tick--red' : '',
			$x1,
			$y1,
			$x2,
			$y2
		);
		if ( $major ) {
			list( $lx, $ly ) = $point( $deg, $r - 50 );
			$labels         .= sprintf( '<text class="tacho__num" x="%s" y="%s">%d</text>', $lx, $ly, $rpm / 1000 );
		}
	}

	$title = strtr( (string) $texts['title'], array( '{redline}' => number_format_i18n( $redline ) ) );

	ob_start();
	?>
	<svg class="tacho" viewBox="0 0 400 400" role="img" aria-labelledby="tacho-title" data-tacho data-idle="<?php echo esc_attr( $idle ); ?>" data-redline="<?php echo esc_attr( $redline ); ?>" data-max="<?php echo esc_attr( $max ); ?>" style="--deg:<?php echo esc_attr( round( $angle( $idle ), 2 ) ); ?>deg">
		<title id="tacho-title"><?php echo esc_html( $title ); ?></title>
		<circle class="tacho__face" cx="200" cy="200" r="196"/>
		<path class="tacho__track" d="<?php echo esc_attr( $arc( 0, $max, $r ) ); ?>"/>
		<path class="tacho__red" d="<?php echo esc_attr( $arc( $redline, $max, $r ) ); ?>"/>
		<g class="tacho__ticks"><?php echo $ticks; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers only. ?></g>
		<g class="tacho__nums" aria-hidden="true"><?php echo $labels; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers only. ?></g>
		<text class="tacho__scale" x="200" y="132" aria-hidden="true"><?php echo esc_html( $texts['scale'] ); ?></text>
		<g class="tacho__needle">
			<line x1="200" y1="228" x2="200" y2="<?php echo esc_attr( 200 - $r + 18 ); ?>"/>
		</g>
		<circle class="tacho__hub" cx="200" cy="200" r="11"/>
		<text class="tacho__readout" x="200" y="272" aria-hidden="true" data-tacho-readout><?php echo esc_html( number_format_i18n( $idle ) ); ?></text>
		<text class="tacho__readout-unit" x="200" y="300" aria-hidden="true"><?php echo esc_html( $texts['unit'] ); ?></text>
	</svg>
	<?php
	return (string) ob_get_clean();
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
