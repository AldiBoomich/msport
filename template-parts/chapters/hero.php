<?php
/**
 * Chapter 1: Hero. The still is the LCP image (eager, high fetch priority); the page's only <h1>.
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title      = msport_front( 'hero_title', $args['title'] );
$msport_text       = msport_front( 'hero_text', __( 'The BMW M6 E63 and its naturally aspirated S85 V10, shown by one car driving through the night.', 'msport' ) );
$msport_cta_label  = msport_front( 'hero_cta_label', __( 'See the spec sheet', 'msport' ) );
$msport_cta_anchor = msport_front( 'hero_cta_anchor', 'specs' );
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--film chapter--hero" data-chapter="hero">
	<?php echo msport_chapter_still( 'hero', true ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container">
		<div class="chapter__panel">
			<h1 class="hero__title"><?php echo esc_html( $msport_title ); ?></h1>
			<?php if ( $msport_text ) : ?>
				<p class="hero__text"><?php echo esc_html( $msport_text ); ?></p>
			<?php endif; ?>
			<?php if ( $msport_cta_label ) : ?>
				<p class="hero__actions">
					<a class="button button--primary" href="<?php echo esc_url( msport_anchor_url( $msport_cta_anchor ) ); ?>"><?php echo esc_html( $msport_cta_label ); ?></a>
				</p>
			<?php endif; ?>
		</div>
	</div>
</section>
