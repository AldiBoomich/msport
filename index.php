<?php
/**
 * Fallback template. The site is one front page plus a few plain pages,
 * so anything else is shown as a simple list of titles.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="main" class="plain-page container">
	<?php if ( have_posts() ) : ?>
		<h1 class="plain-page__title"><?php echo esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1>
		<ul class="plain-page__list">
			<?php
			while ( have_posts() ) :
				the_post();
				?>
				<li><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></li>
			<?php endwhile; ?>
		</ul>
	<?php else : ?>
		<h1 class="plain-page__title"><?php echo esc_html( msport_option( 'opt_empty_title', __( 'Nothing here yet', 'msport' ) ) ); ?></h1>
		<p><a class="button button--secondary" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php echo esc_html( msport_option( 'opt_404_button', __( 'Back to the car', 'msport' ) ) ); ?></a></p>
	<?php endif; ?>
</main>
<?php
get_footer();
