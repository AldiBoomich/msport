<?php
/**
 * Chapter "Film" (night), Ferrari-like: a panoramic driving film edge to edge. The band opens from an inset card as it
 * comes in (scenes.js --rv); the muted loop plays only while it is on screen and loads only then (film.js), with a
 * pause button on it. Reduced motion: it waits for the play button. Without JS: the native player with the poster.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c      = $args;
$msport_video  = (int) msport_front( 'film_video', 0 );
$msport_mobile = (int) msport_front( 'film_video_mobile', 0 );
$msport_poster = (int) msport_front( 'film_poster', 0 );
$msport_src    = $msport_video ? (string) wp_get_attachment_url( $msport_video ) : '';
$msport_msrc   = $msport_mobile ? (string) wp_get_attachment_url( $msport_mobile ) : '';
$msport_pimg   = $msport_poster ? (string) wp_get_attachment_image_url( $msport_poster, 'msport-wide' ) : '';
$msport_label  = msport_front( 'film_label', __( 'Driving film', 'msport' ) );

if ( ! $msport_src ) {
	return;
}
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night film" data-chapter aria-labelledby="film-title">
	<div class="container film__head">
		<h2 id="film-title" class="h2 film__title"><?php echo msport_lines( msport_front( 'film_title', __( 'On the road', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
		<?php if ( msport_front( 'film_lead' ) ) : ?>
			<p class="lead film__lead"><?php echo esc_html( msport_front( 'film_lead' ) ); ?></p>
		<?php endif; ?>
	</div>

	<figure class="film__band" data-reveal data-film>
		<div class="film__frame">
			<video class="film__video" controls muted loop playsinline preload="none" aria-label="<?php echo esc_attr( $msport_label ); ?>"<?php echo $msport_pimg ? ' poster="' . esc_url( $msport_pimg ) . '"' : ''; ?>>
				<?php if ( $msport_msrc ) : ?>
					<source src="<?php echo esc_url( $msport_msrc ); ?>" type="video/mp4" media="(max-width: 47.99em)">
				<?php endif; ?>
				<source src="<?php echo esc_url( $msport_src ); ?>" type="video/mp4">
			</video>
			<button class="film__toggle js-only" type="button" data-film-toggle
				data-label-play="<?php echo esc_attr__( 'Play the film', 'msport' ); ?>"
				data-label-pause="<?php echo esc_attr__( 'Pause the film', 'msport' ); ?>"
				aria-label="<?php echo esc_attr__( 'Play the film', 'msport' ); ?>">
				<svg class="film__icon film__icon--play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z"/></svg>
				<svg class="film__icon film__icon--pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
			</button>
		</div>
		<?php if ( msport_front( 'film_caption' ) ) : ?>
			<figcaption class="container film__caption"><?php echo esc_html( msport_front( 'film_caption' ) ); ?></figcaption>
		<?php endif; ?>
	</figure>
</section>
