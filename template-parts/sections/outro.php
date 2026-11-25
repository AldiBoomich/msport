<?php
/**
 * Chapter 8, outro (night): a big stepped heading, the way to the developer, and the car once more, edge to edge.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c   = $args;
$msport_url = msport_option( 'opt_dev_url' );
$msport_img = (int) msport_front( 'outro_image', 0 );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night outro" data-chapter aria-labelledby="outro-title">
	<div class="container outro__inner">
		<h2 id="outro-title" class="outro__title stepped"><?php echo msport_lines( msport_front( 'outro_title', __( "Built for\n8,250 rpm.", 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
		<div class="outro__side">
			<p class="lead outro__text"><?php echo esc_html( msport_front( 'outro_text' ) ); ?></p>
			<?php if ( $msport_url ) : ?>
				<?php msport_cta( $msport_url, msport_front( 'outro_cta_label', __( 'Get in touch', 'msport' ) ), 'chevron', 'cta--large' ); ?>
			<?php endif; ?>
		</div>
	</div>
	<?php if ( $msport_img ) : ?>
		<figure class="outro__media">
			<?php
			msport_the_image(
				$msport_img,
				'msport-wide',
				array(
					'class' => 'outro__img',
					'sizes' => '(min-width: 48em) 100vw, 150vw',
				)
			);
			?>
		</figure>
	<?php endif; ?>
</section>
