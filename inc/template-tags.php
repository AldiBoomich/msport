<?php
/**
 * Building blocks of the chapter templates: stills, numbers, the tachometer, the V10 sound.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * A chapter still: the 16:9 landscape render, plus the 9:19.5 portrait render through <picture> when it is set.
 * Portrait screens (phones, tablets held upright) get the portrait render, as the live 3D uses portrait camera keys there.
 *
 * @param string $prefix Chapter prefix.
 * @param bool   $lcp    True for the first screen: eager, high fetch priority.
 * @return string HTML or ''.
 */
function msport_chapter_still( $prefix, $lcp = false ) {
	$desktop = (int) msport_front( $prefix . '_still', 0 );
	$mobile  = (int) msport_front( $prefix . '_still_mobile', 0 );
	if ( ! $desktop && ! $mobile ) {
		return '';
	}
	$focal = preg_replace( '/[^0-9.% ]/', '', (string) msport_front( $prefix . '_focal', '50% 50%' ) );
	$attrs = array(
		'class'    => 'chapter__still',
		'loading'  => $lcp ? 'eager' : 'lazy',
		'decoding' => 'async',
		'sizes'    => '100vw',
		'style'    => 'object-position:' . ( $focal ? $focal : '50% 50%' ),
	);
	if ( $lcp ) {
		$attrs['fetchpriority'] = 'high';
	}
	$img = wp_get_attachment_image( $desktop ? $desktop : $mobile, $desktop ? 'msport-still' : 'msport-still-m', false, $attrs );
	if ( ! $img ) {
		return '';
	}
	// Always wrapped: the <picture> is the box that sticks to the screen in film mode (main.css → 8).
	$source = '';
	if ( $desktop && $mobile ) {
		$srcset = wp_get_attachment_image_srcset( $mobile, 'msport-still-m' );
		if ( $srcset ) {
			$source = sprintf( '<source media="(orientation: portrait)" srcset="%s" sizes="100vw">', esc_attr( $srcset ) );
		}
	}
	return '<picture class="chapter__media">' . $source . $img . '</picture>';
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
 * Big figures (value, unit, label, optional note or rpm) as a list.
 *
 * @param array  $rows        Repeater rows: value, unit, label, note (optional), at_rpm (optional).
 * @param string $extra_class Extra class.
 * @return string HTML.
 */
function msport_stats( $rows, $extra_class = '' ) {
	if ( empty( $rows ) || ! is_array( $rows ) ) {
		return '';
	}
	$items = '';
	foreach ( $rows as $row ) {
		$value = isset( $row['value'] ) ? trim( (string) $row['value'] ) : '';
		if ( '' === $value ) {
			continue;
		}
		$unit  = isset( $row['unit'] ) ? trim( (string) $row['unit'] ) : '';
		$label = isset( $row['label'] ) ? trim( (string) $row['label'] ) : '';
		$note  = isset( $row['note'] ) ? trim( (string) $row['note'] ) : '';
		$rpm   = isset( $row['at_rpm'] ) ? (int) $row['at_rpm'] : 0;

		$items .= sprintf(
			'<li class="stat"%s><span class="stat__value" data-value="%s">%s</span>%s%s</li>',
			$rpm ? ' data-at-rpm="' . esc_attr( $rpm ) . '"' : '',
			esc_attr( $value ),
			esc_html( msport_number( $value ) ) . ( $unit ? '<span class="stat__unit">&nbsp;' . esc_html( $unit ) . '</span>' : '' ),
			$label ? '<span class="stat__label">' . esc_html( $label ) . '</span>' : '',
			$note ? '<span class="stat__note">' . esc_html( $note ) . '</span>' : ''
		);
	}
	return $items ? '<ul class="stats ' . esc_attr( $extra_class ) . '">' . $items . '</ul>' : '';
}

/**
 * The tachometer (DESIGN.md → Components → Tachometer), drawn at its static state: needle at the redline.
 *
 * @param int   $idle    Idle rpm.
 * @param int   $redzone Red zone start, rpm.
 * @param int   $redline Redline, rpm.
 * @param array $texts   Texts (M6 front page fields): scale, unit, title ({redline} and {redzone} become the numbers).
 * @return string SVG.
 */
function msport_tachometer( $idle, $redzone, $redline, $texts = array() ) {
	$texts = wp_parse_args(
		$texts,
		array(
			'scale' => __( '×1000 rpm', 'msport' ),
			'unit'  => __( 'rpm', 'msport' ),
			'title' => __( 'Tachometer: the needle at {redline} rpm, red zone from {redzone} rpm.', 'msport' ),
		)
	);

	$redline = max( 1000, (int) $redline );
	$redzone = min( max( 0, (int) $redzone ), $redline );
	$idle    = min( max( 0, (int) $idle ), $redline );
	$max     = (int) ( ceil( $redline / 1000 ) * 1000 );
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
			$rpm >= $redzone ? ' tacho__tick--red' : '',
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

	$title = strtr(
		(string) $texts['title'],
		array(
			'{redline}' => number_format_i18n( $redline ),
			'{redzone}' => number_format_i18n( $redzone ),
		)
	);

	ob_start();
	?>
	<svg class="tacho" viewBox="0 0 400 400" role="img" aria-labelledby="tacho-title" data-idle="<?php echo esc_attr( $idle ); ?>" data-redzone="<?php echo esc_attr( $redzone ); ?>" data-redline="<?php echo esc_attr( $redline ); ?>" data-max="<?php echo esc_attr( $max ); ?>">
		<title id="tacho-title"><?php echo esc_html( $title ); ?></title>
		<path class="tacho__track" d="<?php echo esc_attr( $arc( 0, $max, $r ) ); ?>"/>
		<path class="tacho__red" d="<?php echo esc_attr( $arc( $redzone, $redline, $r ) ); ?>"/>
		<g class="tacho__ticks"><?php echo $ticks; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers only. ?></g>
		<g class="tacho__nums" aria-hidden="true"><?php echo $labels; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers only. ?></g>
		<text class="tacho__scale" x="200" y="128" aria-hidden="true"><?php echo esc_html( $texts['scale'] ); ?></text>
		<g class="tacho__needle" transform="rotate(<?php echo esc_attr( round( $angle( $redline ), 2 ) ); ?> 200 200)">
			<line x1="200" y1="226" x2="200" y2="<?php echo esc_attr( 200 - $r + 18 ); ?>"/>
		</g>
		<circle class="tacho__hub" cx="200" cy="200" r="11"/>
		<text class="tacho__readout" x="200" y="262" aria-hidden="true"><?php echo esc_html( number_format_i18n( $redline ) ); ?></text>
		<text class="tacho__readout-unit" x="200" y="292" aria-hidden="true"><?php echo esc_html( $texts['unit'] ); ?></text>
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
 * A play / pause button for the V10 sound. All buttons control the one <audio> printed in the footer.
 * Without JavaScript the buttons stay hidden and the sound chapter shows the native player instead.
 *
 * @param string $play_label  Label while stopped.
 * @param string $pause_label Label while playing.
 * @param bool   $progress    Show the progress line.
 * @return string HTML.
 */
function msport_sound_button( $play_label, $pause_label, $progress = false ) {
	if ( ! msport_sound_url() ) {
		return '';
	}
	return sprintf(
		'<div class="sound"><button type="button" class="button button--secondary sound__toggle" aria-pressed="false" aria-controls="m6-sound" data-sound-toggle data-label-play="%1$s" data-label-pause="%2$s"><span class="sound__icon" aria-hidden="true"></span><span class="sound__label">%3$s</span></button>%4$s</div>',
		esc_attr( $play_label ),
		esc_attr( $pause_label ),
		esc_html( $play_label ),
		$progress ? '<span class="sound__progress" aria-hidden="true"><span class="sound__bar" data-sound-progress></span></span>' : ''
	);
}
