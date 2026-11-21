<?php
/**
 * Chapter 8: SMG III. Heading, intro and the gear readout (static state: all seven gears as a list).
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title = msport_front( 'smg_title', $args['title'] );
$msport_text  = msport_front( 'smg_text' );
$msport_gears = msport_front( 'smg_gears', array() );
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--film chapter--smg" data-chapter="smg">
	<?php echo msport_chapter_still( 'smg' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_get_attachment_image(). ?>
	<div class="chapter__inner container">
		<div class="chapter__panel">
			<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
			<?php if ( $msport_text ) : ?>
				<div class="chapter__text"><?php echo msport_paragraphs( $msport_text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per line. ?></div>
			<?php endif; ?>
			<?php if ( $msport_gears ) : ?>
				<ol class="gears">
					<?php foreach ( $msport_gears as $msport_gear ) : ?>
						<?php
						if ( empty( $msport_gear['line'] ) ) {
							continue;
						}
						?>
						<li class="gear">
							<span class="gear__number"><?php echo esc_html( $msport_gear['gear'] ); ?></span>
							<span class="gear__line"><?php echo esc_html( $msport_gear['line'] ); ?></span>
						</li>
					<?php endforeach; ?>
				</ol>
			<?php endif; ?>
		</div>
	</div>
</section>
