<?php
/**
 * Default page (privacy policy and other plain pages): title + editor content.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main" class="plain-page container">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article <?php post_class( 'plain-page__article' ); ?>>
			<h1 class="plain-page__title"><?php the_title(); ?></h1>
			<div class="entry-content">
				<?php the_content(); ?>
			</div>
		</article>
	<?php endwhile; ?>
</main>
<?php
get_footer();
