<?php
/**
 * 404 page.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main">
	<h1><?php esc_html_e( 'Page not found', 'msport' ); ?></h1>
	<p><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back to the front page', 'msport' ); ?></a></p>
</main>
<?php
get_footer();
