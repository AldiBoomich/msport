<?php
/**
 * Styles and scripts. No jQuery, every script deferred.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * Early head: no-js → js class switch.
 */
function msport_head_early() {
	wp_print_inline_script_tag( "document.documentElement.classList.replace('no-js','js');" );
}
add_action( 'wp_head', 'msport_head_early', 1 );
