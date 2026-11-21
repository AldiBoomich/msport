<?php
/**
 * Theme bootstrap: constants and includes.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

define( 'MSPORT_VERSION', '0.1.0' );
define( 'MSPORT_DIR', get_template_directory() );
define( 'MSPORT_URI', get_template_directory_uri() );

require MSPORT_DIR . '/inc/helpers.php';
require MSPORT_DIR . '/inc/setup.php';
require MSPORT_DIR . '/inc/cleanup.php';
require MSPORT_DIR . '/inc/assets.php';
require MSPORT_DIR . '/inc/acf.php';
require MSPORT_DIR . '/inc/chapters.php';
require MSPORT_DIR . '/inc/template-tags.php';
require MSPORT_DIR . '/inc/film.php';
