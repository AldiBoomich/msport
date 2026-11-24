<?php
/**
 * Chapter 5, drive (day): SMG III, M Drive, the cockpit — a collage of rounded photos drifting at different speeds.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c      = $args;
$msport_photos = msport_front( 'drive_photos', array() );
$msport_photos = is_array( $msport_photos ) ? array_values( array_filter( $msport_photos, static fn( $p ) => ! empty( $p['image'] ) ) ) : array();
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--day drive" data-chapter aria-labelledby="drive-title">
	<div class="container drive__grid">
		<div class="drive__copy">
			<h2 id="drive-title" class="h2 stepped"><?php echo msport_lines( msport_front( 'drive_title', __( 'Drive', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
			<div class="drive__text"><?php echo msport_paragraphs( msport_front( 'drive_text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_paragraphs(). ?></div>
		</div>

		<?php if ( $msport_photos ) : ?>
			<ul class="collage" role="list">
				<?php foreach ( $msport_photos as $msport_i => $msport_photo ) : ?>
					<li class="collage__item collage__item--<?php echo (int) $msport_i + 1; ?>" data-drift="<?php echo esc_attr( array( 0.06, -0.08, 0.1, -0.05 )[ $msport_i % 4 ] ); ?>">
						<figure class="collage__figure">
							<?php
							msport_the_image(
								$msport_photo['image'],
								0 === $msport_i ? 'msport-tall' : 'msport-panel',
								array(
									'class' => 'collage__img',
									'sizes' => '(min-width: 62em) 30vw, 90vw',
								)
							);
							?>
							<?php if ( ! empty( $msport_photo['caption'] ) ) : ?>
								<figcaption class="collage__caption"><?php echo esc_html( $msport_photo['caption'] ); ?></figcaption>
							<?php endif; ?>
						</figure>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
</section>
