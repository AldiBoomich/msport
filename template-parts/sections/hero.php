<?php
/**
 * Chapter 1, hero (night): the studio, the car, the only h1, the way to the sound.
 * Motion: page-load "lights up" + the scroll exit into the profile scene (scenes.js → --p).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c      = $args;
$msport_img    = (int) msport_front( 'hero_image', 0 );
$msport_mobile = (int) msport_front( 'hero_image_mobile', 0 );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night hero scene" data-chapter data-scene="hero" aria-labelledby="hero-title">
	<div class="scene__sticky hero__stage">
		<div class="studio" aria-hidden="true"></div>
		<p class="hero__wordmark" aria-hidden="true"><?php echo esc_html( msport_front( 'hero_wordmark', __( 'M6', 'msport' ) ) ); ?></p>

		<?php if ( $msport_img ) : ?>
			<div class="hero__car">
				<picture>
					<?php if ( $msport_mobile ) : ?>
						<source media="(max-width: 47.99em) and (orientation: portrait)" srcset="<?php echo esc_attr( (string) wp_get_attachment_image_srcset( $msport_mobile, 'msport-wide' ) ); ?>" sizes="100vw">
					<?php endif; ?>
					<?php
					msport_the_image(
						$msport_img,
						'msport-wide',
						array(
							'class'   => 'hero__img',
							'loading' => 'eager',
							'sizes'   => '(min-width: 75em) 62vw, (min-width: 48em) 84vw, 128vw',
						)
					);
					?>
				</picture>
				<span class="contact-shadow" aria-hidden="true"></span>
			</div>
		<?php endif; ?>

		<div class="container hero__copy">
			<h1 id="hero-title" class="h1 stepped"><?php echo msport_lines( msport_front( 'hero_title', __( "BMW M6 Coupé.\nA V10 that revs\nto 8,250.", 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h1>
			<p class="lead hero__lead"><?php echo esc_html( msport_front( 'hero_lead' ) ); ?></p>
			<a class="btn btn--light" href="<?php echo esc_url( msport_chapter_url( 'power' ) ); ?>"><?php echo esc_html( msport_front( 'hero_cta_label', __( 'Hear the V10', 'msport' ) ) ); ?></a>
		</div>
		<div class="hero__veil" aria-hidden="true"></div>
	</div>
</section>
