<?php
/**
 * Site footer: developer contact, footer menu, credits (the 3D model credit must stay visible).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_dev_name     = msport_option( 'opt_dev_name' );
$msport_dev_url      = msport_option( 'opt_dev_url' );
$msport_model_credit = msport_front( 'scene_model_credit', __( '3D model “BMW M6 (E63)” by Mona x Supercars, CC BY 4.0.', 'msport' ) );
$msport_social       = msport_option( 'opt_social', array() );
?>
<footer class="site-footer">
	<div class="site-footer__inner container">
		<?php if ( $msport_dev_name ) : ?>
			<p class="site-footer__dev">
				<?php if ( $msport_dev_url ) : ?>
					<a href="<?php echo esc_url( $msport_dev_url ); ?>"><?php echo esc_html( $msport_dev_name ); ?></a>
				<?php else : ?>
					<?php echo esc_html( $msport_dev_name ); ?>
				<?php endif; ?>
			</p>
		<?php endif; ?>

		<?php if ( is_array( $msport_social ) && $msport_social ) : ?>
			<ul class="site-footer__social">
				<?php foreach ( $msport_social as $msport_link ) : ?>
					<?php if ( ! empty( $msport_link['url'] ) && ! empty( $msport_link['label'] ) ) : ?>
						<li><a href="<?php echo esc_url( $msport_link['url'] ); ?>"><?php echo esc_html( $msport_link['label'] ); ?></a></li>
					<?php endif; ?>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>

		<?php
		if ( has_nav_menu( 'footer' ) ) {
			wp_nav_menu(
				array(
					'theme_location'       => 'footer',
					'container'            => 'nav',
					'container_class'      => 'site-footer__nav',
					'container_aria_label' => msport_option( 'opt_footer_nav_label', __( 'Footer', 'msport' ) ),
					'menu_class'           => 'site-footer__list',
					'depth'                => 1,
					'fallback_cb'          => false,
				)
			);
		}
		?>

		<p class="site-footer__credit"><?php echo esc_html( $msport_model_credit ); ?></p>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
