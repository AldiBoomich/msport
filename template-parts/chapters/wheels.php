<?php
/**
 * Chapter 4: Wheels and brakes. Heading, text and up to three big numbers.
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title   = msport_front( 'wheels_title', $args['title'] );
$msport_text    = msport_front( 'wheels_text' );
$msport_numbers = msport_front( 'wheels_numbers', array() );
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--film chapter--wheels" data-chapter="wheels">
	<?php echo msport_chapter_still( 'wheels' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container">
		<div class="chapter__panel">
			<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
			<?php if ( $msport_text ) : ?>
				<div class="chapter__text"><?php echo msport_paragraphs( $msport_text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per line. ?></div>
			<?php endif; ?>
			<?php echo msport_stats( $msport_numbers ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?>
		</div>
	</div>
</section>
