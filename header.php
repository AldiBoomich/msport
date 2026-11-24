<?php
/**
 * Document head and the site header: skip link, wordmark, chapter rail (menu on phones), the "Hear the V10" button.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_desc     = trim( (string) msport_option( 'opt_meta_description', get_bloginfo( 'description' ) ) );
$msport_chapters = is_front_page() ? msport_chapters() : array();
$msport_menu     = msport_option( 'opt_menu_label', __( 'Menu', 'msport' ) );
$msport_close    = msport_option( 'opt_close_label', __( 'Close', 'msport' ) );
?>
<!doctype html>
<html <?php language_attributes(); ?> class="no-js">
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php if ( $msport_desc ) : ?>
		<meta name="description" content="<?php echo esc_attr( $msport_desc ); ?>">
	<?php endif; ?>
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main"><?php echo esc_html( msport_option( 'opt_skip_label', __( 'Skip to content', 'msport' ) ) ); ?></a>

<header class="site-header" data-header>
	<a class="wordmark" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php echo esc_html( msport_option( 'opt_wordmark', __( 'M6', 'msport' ) ) ); ?></a>

	<?php if ( $msport_chapters ) : ?>
		<button class="menu-toggle js-only" type="button" aria-expanded="false" aria-controls="rail" data-menu-toggle data-label-open="<?php echo esc_attr( $msport_menu ); ?>" data-label-close="<?php echo esc_attr( $msport_close ); ?>">
			<span class="menu-toggle__bars" aria-hidden="true"></span>
			<span data-menu-label><?php echo esc_html( $msport_menu ); ?></span>
		</button>

		<nav id="rail" class="rail" aria-label="<?php echo esc_attr( msport_option( 'opt_nav_label', __( 'Chapters', 'msport' ) ) ); ?>" data-rail>
			<ol class="rail__list">
				<?php foreach ( $msport_chapters as $msport_chapter ) : ?>
					<li class="rail__item">
						<a class="rail__link" href="#<?php echo esc_attr( $msport_chapter['anchor'] ); ?>" data-rail-link>
							<span class="rail__dot" aria-hidden="true"></span>
							<span class="rail__name"><?php echo esc_html( $msport_chapter['nav'] ); ?></span>
						</a>
					</li>
				<?php endforeach; ?>
			</ol>
		</nav>
	<?php endif; ?>

	<a class="btn btn--light btn--small site-header__cta" href="<?php echo esc_url( msport_chapter_url( 'power' ) ); ?>"><?php echo esc_html( msport_option( 'opt_header_cta_label', __( 'Hear the V10', 'msport' ) ) ); ?></a>
</header>
