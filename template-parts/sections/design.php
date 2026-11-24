<?php
/**
 * Chapter 3, design (day): the car with hotspots. A hotspot opens its detail; with JS the details become a panel on
 * the right and the car zooms into the point (hotspots.js); without JS they are a list under the car.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c     = $args;
$msport_img   = (int) msport_front( 'design_image', 0 );
$msport_spots = msport_front( 'design_hotspots', array() );
$msport_spots = is_array( $msport_spots ) ? array_values( $msport_spots ) : array();
$msport_close = msport_option( 'opt_close_label', __( 'Close', 'msport' ) );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--day design" data-chapter aria-labelledby="design-title">
	<div class="container design__head">
		<h2 id="design-title" class="h2 stepped"><?php echo msport_lines( msport_front( 'design_title', __( 'Design', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
		<p class="lead design__lead"><?php echo esc_html( msport_front( 'design_lead' ) ); ?></p>
	</div>

	<div class="design__stage" data-hotspots>
		<?php if ( $msport_img ) : ?>
			<div class="design__frame" data-zoom>
				<?php
				msport_the_image(
					$msport_img,
					'msport-wide',
					array(
						'class' => 'design__img',
						'sizes' => '(min-width: 75em) 90vw, 100vw',
					)
				);
				?>
				<span class="contact-shadow" aria-hidden="true"></span>
				<?php foreach ( $msport_spots as $msport_i => $msport_spot ) : ?>
					<button class="hotspot js-only" type="button" style="--x:<?php echo esc_attr( (float) ( $msport_spot['x'] ?? 50 ) ); ?>%;--y:<?php echo esc_attr( (float) ( $msport_spot['y'] ?? 50 ) ); ?>%" aria-expanded="false" aria-controls="detail-<?php echo (int) $msport_i; ?>" data-hotspot>
						<span class="hotspot__dot" aria-hidden="true"></span>
						<span class="hotspot__label"><?php echo esc_html( $msport_spot['label'] ?? '' ); ?></span>
					</button>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>

		<?php if ( $msport_spots ) : ?>
			<div class="details" data-details>
				<?php foreach ( $msport_spots as $msport_i => $msport_spot ) : ?>
					<article id="detail-<?php echo (int) $msport_i; ?>" class="detail" aria-labelledby="detail-title-<?php echo (int) $msport_i; ?>" data-detail tabindex="-1">
						<?php if ( ! empty( $msport_spot['image'] ) ) : ?>
							<figure class="detail__media">
							<?php
							msport_the_image(
								$msport_spot['image'],
								'msport-panel',
								array(
									'class' => 'detail__img',
									'sizes' => '(min-width: 62em) 36vw, 100vw',
								)
							);
							?>
							</figure>
						<?php endif; ?>
						<h3 id="detail-title-<?php echo (int) $msport_i; ?>" class="h3 detail__title"><?php echo esc_html( $msport_spot['title'] ?? '' ); ?></h3>
						<div class="detail__text"><?php echo msport_paragraphs( $msport_spot['text'] ?? '' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_paragraphs(). ?></div>
						<button class="btn btn--ghost detail__close js-only" type="button" data-detail-close><span class="detail__x" aria-hidden="true"></span><?php echo esc_html( $msport_close ); ?></button>
					</article>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</div>
</section>
