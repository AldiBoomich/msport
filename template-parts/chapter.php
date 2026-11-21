<?php
/**
 * Generic chapter: still (when set), heading and text. Used by chapters without their own template
 * (Nose and lights, Gills, Carbon roof).
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_prefix = $args['prefix'];
$msport_title  = msport_front( $msport_prefix . '_title', $args['title'] );
$msport_text   = msport_front( $msport_prefix . '_text' );
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--<?php echo esc_attr( $args['kind'] ); ?> chapter--<?php echo esc_attr( $msport_prefix ); ?>" data-chapter="<?php echo esc_attr( $msport_prefix ); ?>">
	<?php echo msport_chapter_still( $msport_prefix ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container">
		<div class="chapter__panel">
			<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
			<?php if ( $msport_text ) : ?>
				<div class="chapter__text"><?php echo msport_paragraphs( $msport_text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per line. ?></div>
			<?php endif; ?>
		</div>
	</div>
</section>
