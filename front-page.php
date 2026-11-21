<?php
/**
 * Front page: the 10 chapters of the 3D film, in order.
 *
 * Each chapter renders template-parts/chapters/{prefix}.php when it exists,
 * otherwise the generic template-parts/chapter.php.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main" class="film">
	<?php
	foreach ( msport_chapters() as $msport_chapter ) {
		if ( ! msport_front_flag( $msport_chapter['prefix'] . '_show' ) ) {
			continue;
		}
		$msport_chapter['anchor'] = sanitize_title( msport_front( $msport_chapter['prefix'] . '_anchor', $msport_chapter['anchor'] ) );

		$msport_part = locate_template( 'template-parts/chapters/' . $msport_chapter['prefix'] . '.php' ) ? 'template-parts/chapters/' . $msport_chapter['prefix'] : 'template-parts/chapter';
		get_template_part( $msport_part, null, $msport_chapter );
	}

	// One recording for every "Play the V10" button (assets/js/sound.js). Loaded only on press.
	$msport_sound = msport_sound_url();
	if ( $msport_sound ) {
		printf( '<audio id="m6-sound" preload="none" src="%s"></audio>', esc_url( $msport_sound ) );
	}
	?>
</main>
<?php
get_footer();
