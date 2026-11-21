<?php
/**
 * Chapter 7: Tail and sound. Heading, text and the V10 player (never autoplays).
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title  = msport_front( 'sound_title', $args['title'] );
$msport_text   = msport_front( 'sound_text' );
$msport_play   = msport_front( 'sound_play_label', __( 'Play the V10', 'msport' ) );
$msport_pause  = msport_front( 'sound_pause_label', __( 'Pause', 'msport' ) );
$msport_credit = msport_option( 'opt_sound_credit' );
$msport_url    = msport_sound_url();
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--film chapter--sound" data-chapter="sound">
	<?php echo msport_chapter_still( 'sound' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container">
		<div class="chapter__panel">
			<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
			<?php if ( $msport_text ) : ?>
				<div class="chapter__text"><?php echo msport_paragraphs( $msport_text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per line. ?></div>
			<?php endif; ?>
			<?php if ( $msport_url ) : ?>
				<div class="player">
					<?php echo msport_sound_button( $msport_play, $msport_pause, true ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?>
					<noscript><audio class="player__native" controls preload="none" src="<?php echo esc_url( $msport_url ); ?>"></audio></noscript>
					<?php if ( $msport_credit ) : ?>
						<p class="player__credit"><?php echo esc_html( $msport_credit ); ?></p>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>
