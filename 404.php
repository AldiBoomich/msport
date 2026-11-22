<?php
/**
 * 404: "You hit the limiter."
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main" class="plain-page plain-page--404 container">
	<p class="plain-page__code" aria-hidden="true">404</p>
	<h1 class="plain-page__title"><?php echo esc_html( msport_option( 'opt_404_title', __( 'You hit the limiter.', 'msport' ) ) ); ?></h1>
	<p class="plain-page__lead"><?php echo esc_html( msport_option( 'opt_404_text', __( 'This page does not exist. The car is still running on the front page.', 'msport' ) ) ); ?></p>
	<p><a class="button button--primary" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php echo esc_html( msport_option( 'opt_404_button', __( 'Back to the car', 'msport' ) ) ); ?></a></p>
</main>
<?php
get_footer();
