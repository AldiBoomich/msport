<?php
/**
 * Chapter 7, heritage (day): the ancestor in black and white next to the M6.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c    = $args;
$msport_then = (int) msport_front( 'heritage_then_image', 0 );
$msport_now  = (int) msport_front( 'heritage_now_image', 0 );
$msport_now  = $msport_now ? $msport_now : (int) msport_front( 'hero_image', 0 );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--day heritage" data-chapter aria-labelledby="heritage-title">
	<div class="container heritage__grid">
		<div class="heritage__copy">
			<h2 id="heritage-title" class="h2 stepped"><?php echo msport_lines( msport_front( 'heritage_title', __( 'Heritage', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
			<div class="heritage__text"><?php echo msport_paragraphs( msport_front( 'heritage_text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_paragraphs(). ?></div>
		</div>

		<?php if ( $msport_then ) : ?>
			<figure class="heritage__then">
				<?php
				msport_the_image(
					$msport_then,
					'msport-panel',
					array(
						'class' => 'heritage__img',
						'sizes' => '(min-width: 62em) 50vw, 100vw',
					)
				);
				?>
				<figcaption class="heritage__caption"><?php echo esc_html( msport_front( 'heritage_then_caption' ) ); ?></figcaption>
			</figure>
		<?php endif; ?>

		<?php if ( $msport_now ) : ?>
			<figure class="heritage__now<?php echo msport_is_cutout( $msport_now ) ? '' : ' is-photo'; ?>">
				<?php
				msport_the_image(
					$msport_now,
					'msport-wide',
					array(
						'class' => 'heritage__cut',
						'sizes' => '(min-width: 62em) 45vw, 100vw',
					)
				);
				?>
				<figcaption class="heritage__caption"><?php echo esc_html( msport_front( 'heritage_now_caption' ) ); ?></figcaption>
			</figure>
		<?php endif; ?>
	</div>
</section>
