<?php
/**
 * Front page: the chapters of the M6 page, in order (inc/chapters.php).
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main" class="page">
	<?php
	foreach ( msport_chapters() as $msport_chapter ) {
		get_template_part( 'template-parts/sections/' . $msport_chapter['prefix'], null, $msport_chapter );
	}
	?>
</main>
<?php
get_footer();
