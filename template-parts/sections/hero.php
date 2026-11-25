<?php
/**
 * Chapter 1, hero (night), Koenigsegg-like: a full-bleed studio photo, the model name large on the left (the only h1)
 * with the lead under it, the way to the sound on the right.
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
		<?php if ( $msport_img ) : ?>
			<div class="hero__media<?php echo $msport_mobile ? ' has-portrait' : ''; ?>">
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
							// Portrait phones show the shot as a band about twice the screen width (main.css, 9 Hero).
							'sizes'   => $msport_mobile ? '100vw' : '(max-width: 47.99em) and (orientation: portrait) 212vw, 100vw',
						)
					);
					?>
				</picture>
			</div>
		<?php endif; ?>
		<div class="hero__shade" aria-hidden="true"></div>

		<div class="container hero__copy">
			<h1 id="hero-title" class="hero__title stepped"><?php echo msport_lines( msport_front( 'hero_title', __( "BMW\nM6", 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h1>
			<p class="lead hero__lead"><?php echo esc_html( msport_front( 'hero_lead' ) ); ?></p>
			<?php msport_cta( msport_chapter_url( 'power' ), msport_front( 'hero_cta_label', __( 'Hear the V10', 'msport' ) ), 'play', 'cta--large hero__cta' ); ?>
		</div>
		<div class="hero__veil" aria-hidden="true"></div>
	</div>
</section>
