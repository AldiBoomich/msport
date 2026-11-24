<?php
/**
 * Front page. Empty until the new design is defined (docs/ROADMAP.md).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main">
	<h1><?php echo esc_html( get_bloginfo( 'name' ) ); ?></h1>
</main>
<?php
get_footer();
