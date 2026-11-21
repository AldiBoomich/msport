<?php
/**
 * Chapter 10: the final shot (headlights into the camera) and a contact link to the developer.
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title = msport_front( 'outro_title', $args['title'] );
$msport_text  = msport_front( 'outro_text' );
$msport_label = msport_front( 'outro_cta_label', __( 'Get in touch', 'msport' ) );
$msport_link  = trim( (string) msport_front( 'outro_cta_link', msport_option( 'opt_dev_url' ) ) );

// The link field takes a web address or an email address.
if ( is_email( $msport_link ) ) {
	$msport_link = 'mailto:' . $msport_link;
}
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--film chapter--outro" data-chapter="outro">
	<?php echo msport_chapter_still( 'outro' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container">
		<div class="chapter__panel">
			<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
			<?php if ( $msport_text ) : ?>
				<div class="chapter__text"><?php echo msport_paragraphs( $msport_text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per line. ?></div>
			<?php endif; ?>
			<?php if ( $msport_link && $msport_label ) : ?>
				<p class="chapter__actions">
					<a class="button button--primary" href="<?php echo esc_url( $msport_link, array( 'http', 'https', 'mailto' ) ); ?>"><?php echo esc_html( $msport_label ); ?></a>
				</p>
			<?php endif; ?>
		</div>
	</div>
</section>
