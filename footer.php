<?php
/**
 * Site footer: one line — developer credit and the photo / sound credits.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_dev_name = msport_option( 'opt_dev_name' );
$msport_dev_url  = msport_option( 'opt_dev_url' );
$msport_credits  = array_filter( array_map( 'trim', preg_split( '/\R/', (string) msport_option( 'opt_credits' ) ) ), 'strlen' );
?>
<footer class="site-footer">
	<div class="container site-footer__inner">
		<?php if ( $msport_dev_name ) : ?>
			<p class="site-footer__dev">
				<?php echo esc_html( msport_option( 'opt_dev_prefix', __( 'Page by', 'msport' ) ) ); ?>
				<?php if ( $msport_dev_url ) : ?>
					<a href="<?php echo esc_url( $msport_dev_url ); ?>"><?php echo esc_html( $msport_dev_name ); ?></a>
				<?php else : ?>
					<?php echo esc_html( $msport_dev_name ); ?>
				<?php endif; ?>
			</p>
		<?php endif; ?>

		<?php if ( $msport_credits ) : ?>
			<details class="credits">
				<summary class="credits__toggle"><?php echo esc_html( msport_option( 'opt_credits_label', __( 'Photo and sound credits', 'msport' ) ) ); ?></summary>
				<ul class="credits__list">
					<?php foreach ( $msport_credits as $msport_line ) : ?>
						<li><?php echo esc_html( $msport_line ); ?></li>
					<?php endforeach; ?>
				</ul>
			</details>
		<?php endif; ?>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
