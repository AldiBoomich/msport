<?php
/**
 * Fallback template: a simple list of titles.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main">
	<?php if ( have_posts() ) : ?>
		<h1><?php echo esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1>
		<ul>
			<?php
			while ( have_posts() ) :
				the_post();
				?>
				<li><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></li>
			<?php endwhile; ?>
		</ul>
	<?php else : ?>
		<h1><?php esc_html_e( 'Nothing here yet', 'msport' ); ?></h1>
	<?php endif; ?>
</main>
<?php
get_footer();
