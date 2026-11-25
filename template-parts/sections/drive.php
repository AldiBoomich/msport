<?php
/**
 * Chapter 5, drive (day): the first photo (the cockpit) fills the screen and opens from an inset card as it comes in
 * (scenes.js --rv); below it the heading and the text in one row, and the other photos as a large editorial pair (a tall
 * frame and a wide one) that drifts slightly against the scroll (scenes.js --sp).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c      = $args;
$msport_photos = msport_front( 'drive_photos', array() );
$msport_photos = is_array( $msport_photos ) ? array_values( array_filter( $msport_photos, static fn( $p ) => ! empty( $p['image'] ) ) ) : array();
$msport_first  = array_shift( $msport_photos );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--day drive" data-chapter aria-labelledby="drive-title">
	<?php if ( $msport_first ) : ?>
		<figure class="bleed drive__bleed" data-reveal>
			<div class="bleed__frame">
				<?php
				msport_the_image(
					$msport_first['image'],
					'msport-wide',
					array(
						'class' => 'bleed__img drive__img',
						'sizes' => '100vw',
					)
				);
				?>
				<?php if ( ! empty( $msport_first['caption'] ) ) : ?>
					<figcaption class="container drive__bleed-caption"><?php echo esc_html( $msport_first['caption'] ); ?></figcaption>
				<?php endif; ?>
			</div>
		</figure>
	<?php endif; ?>

	<div class="container drive__grid">
		<div class="drive__copy">
			<h2 id="drive-title" class="h2"><?php echo msport_lines( msport_front( 'drive_title', __( 'Drive', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
			<div class="drive__text"><?php echo msport_paragraphs( msport_front( 'drive_text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_paragraphs(). ?></div>
		</div>

		<?php if ( $msport_photos ) : ?>
			<ul class="collage" role="list">
				<?php foreach ( $msport_photos as $msport_i => $msport_photo ) : ?>
					<li class="collage__item" data-drift="<?php echo esc_attr( array( -0.05, 0.08 )[ $msport_i % 2 ] ); ?>">
						<figure class="collage__figure">
							<?php
							msport_the_image(
								$msport_photo['image'],
								0 === $msport_i % 2 ? 'msport-tall' : 'msport-wide',
								array(
									'class' => 'collage__img',
									'sizes' => 0 === $msport_i % 2 ? '(min-width: 48em) 40vw, 90vw' : '(min-width: 48em) 56vw, 90vw',
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
