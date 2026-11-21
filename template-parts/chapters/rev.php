<?php
/**
 * Chapter 3: the V10 (signature). Static state: tachometer at the redline, final figures, sound button.
 * The scroll-driven needle and counters come with the 3D film (ROADMAP §6) and read the data-* attributes.
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title   = msport_front( 'rev_title', $args['title'] );
$msport_text    = msport_front( 'rev_text' );
$msport_figures = msport_front( 'rev_figures', array() );
$msport_idle    = (int) msport_front( 'rev_idle', 800 );
$msport_redzone = (int) msport_front( 'rev_redzone_start', 7500 );
$msport_redline = (int) msport_front( 'rev_redline', 8250 );
$msport_sound   = msport_front( 'rev_sound_label', __( 'Play the V10', 'msport' ) );
$msport_pause   = msport_front( 'sound_pause_label', __( 'Pause', 'msport' ) );
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--film chapter--rev" data-chapter="rev">
	<?php echo msport_chapter_still( 'rev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container split">
		<div class="chapter__panel">
			<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
			<?php if ( $msport_text ) : ?>
				<div class="chapter__text"><?php echo msport_paragraphs( $msport_text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per line. ?></div>
			<?php endif; ?>
			<?php echo msport_stats( $msport_figures, 'stats--rev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?>
			<?php echo msport_sound_button( $msport_sound, $msport_pause ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?>
		</div>
		<div class="split__aside">
			<?php echo msport_tachometer( $msport_idle, $msport_redzone, $msport_redline ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?>
		</div>
	</div>
</section>
