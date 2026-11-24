<?php
/**
 * Chapter 7, heritage (day): then and now as a matched pair — the ancestor in black and white, the E63 in colour,
 * the same frame and the same three-quarter angle, the years set large under them.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c    = $args;
$msport_then = (int) msport_front( 'heritage_then_image', 0 );
$msport_now  = (int) msport_front( 'heritage_now_image', 0 );
$msport_now  = $msport_now ? $msport_now : (int) msport_front( 'hero_image', 0 );
$msport_pair = array(
	'then' => array( $msport_then, msport_front( 'heritage_then_caption' ) ),
	'now'  => array( $msport_now, msport_front( 'heritage_now_caption' ) ),
);
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--day heritage" data-chapter aria-labelledby="heritage-title">
	<div class="container heritage__grid">
		<div class="heritage__copy">
			<h2 id="heritage-title" class="h2 stepped"><?php echo msport_lines( msport_front( 'heritage_title', __( 'Heritage', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
			<div class="heritage__text"><?php echo msport_paragraphs( msport_front( 'heritage_text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_paragraphs(). ?></div>
		</div>

		<?php foreach ( $msport_pair as $msport_key => $msport_item ) : ?>
			<?php
			if ( ! $msport_item[0] ) {
				continue;
			}
			?>
			<figure class="heritage__item heritage__<?php echo esc_attr( $msport_key ); ?>">
				<div class="heritage__frame">
					<?php
					msport_the_image(
						$msport_item[0],
						'msport-wide',
						array(
							'class' => 'heritage__img',
							'sizes' => '(min-width: 62em) 50vw, 100vw',
						)
					);
					?>
				</div>
				<figcaption class="heritage__caption"><?php echo msport_year_caption( $msport_item[1] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_year_caption(). ?></figcaption>
			</figure>
		<?php endforeach; ?>
	</div>
</section>
