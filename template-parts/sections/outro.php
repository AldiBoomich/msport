<?php
/**
 * Chapter 8, outro (night): a big stepped heading and the way to the developer.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c   = $args;
$msport_url = msport_option( 'opt_dev_url' );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night outro" data-chapter aria-labelledby="outro-title">
	<div class="container outro__inner">
		<h2 id="outro-title" class="outro__title stepped"><?php echo msport_lines( msport_front( 'outro_title', __( "Built for\n8,250 rpm.", 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
		<div class="outro__side">
			<p class="lead outro__text"><?php echo esc_html( msport_front( 'outro_text' ) ); ?></p>
			<?php if ( $msport_url ) : ?>
				<a class="btn btn--light" href="<?php echo esc_url( $msport_url ); ?>"><?php echo esc_html( msport_front( 'outro_cta_label', __( 'Get in touch', 'msport' ) ) ); ?></a>
			<?php endif; ?>
		</div>
	</div>
</section>
