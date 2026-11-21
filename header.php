<?php
/**
 * Document head and site header: skip link, wordmark, anchor menu, primary button.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_wordmark   = msport_option( 'opt_wordmark', __( 'M6 E63', 'msport' ) );
$msport_cta_label  = msport_option( 'opt_header_cta_label', __( 'Hear the V10', 'msport' ) );
$msport_cta_anchor = msport_option( 'opt_header_cta_anchor', 'sound' );
$msport_has_menu   = has_nav_menu( 'menu-1' );
?>
<!doctype html>
<html <?php language_attributes(); ?> class="no-js">
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main"><?php esc_html_e( 'Skip to content', 'msport' ); ?></a>

<header class="site-header" data-header>
	<div class="site-header__inner container">
		<a class="wordmark" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php echo esc_html( $msport_wordmark ); ?></a>

		<?php if ( $msport_has_menu ) : ?>
			<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle
				data-label-open="<?php esc_attr_e( 'Menu', 'msport' ); ?>"
				data-label-close="<?php esc_attr_e( 'Close', 'msport' ); ?>">
				<span class="menu-toggle__bars" aria-hidden="true"></span>
				<span class="menu-toggle__label" data-menu-label><?php esc_html_e( 'Menu', 'msport' ); ?></span>
			</button>

			<nav id="site-nav" class="site-nav" aria-label="<?php esc_attr_e( 'Chapters', 'msport' ); ?>" data-menu>
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'menu-1',
						'container'      => false,
						'menu_class'     => 'site-nav__list',
						'depth'          => 1,
						'fallback_cb'    => false,
					)
				);
				?>
				<a class="button button--primary site-nav__cta" href="<?php echo esc_url( msport_anchor_url( $msport_cta_anchor ) ); ?>"><?php echo esc_html( $msport_cta_label ); ?></a>
			</nav>
		<?php endif; ?>

		<a class="button button--primary site-header__cta" href="<?php echo esc_url( msport_anchor_url( $msport_cta_anchor ) ); ?>"><?php echo esc_html( $msport_cta_label ); ?></a>
	</div>
</header>
