<?php
/**
 * Link previews and search: Open Graph and Twitter card tags, plus a small JSON-LD description of the page.
 * The share image, title and description come from M6 Settings → Search and 404. When an SEO plugin is active
 * (Yoast, Rank Math, SEOPress, AIOSEO), it owns these tags and the theme prints nothing.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

/**
 * True when an SEO plugin already prints the social tags.
 *
 * @return bool
 */
function msport_seo_plugin_active() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || defined( 'AIOSEO_VERSION' );
}

/**
 * The front page title (browser tab, search results) from M6 Settings → Page title.
 *
 * @param string $title Title from WordPress ('' = build it as usual).
 * @return string
 */
function msport_front_title( $title ) {
	if ( is_front_page() && ! msport_seo_plugin_active() ) {
		$own = trim( (string) msport_option( 'opt_share_title', '' ) );
		return '' !== $own ? $own : $title;
	}
	return $title;
}
add_filter( 'pre_get_document_title', 'msport_front_title' );

/**
 * Print the social tags and JSON-LD in the head.
 */
function msport_social_tags() {
	if ( msport_seo_plugin_active() || is_404() ) {
		return;
	}
	$title = wp_get_document_title();
	$desc  = trim( (string) msport_option( 'opt_meta_description', get_bloginfo( 'description' ) ) );
	$url   = is_front_page() ? home_url( '/' ) : (string) get_permalink();
	$img   = (int) msport_option( 'opt_share_image', 0 );
	$src   = $img ? wp_get_attachment_image_src( $img, 'full' ) : false;
	$alt   = $img ? (string) get_post_meta( $img, '_wp_attachment_image_alt', true ) : '';

	$tags = array(
		'og:type'      => 'website',
		'og:site_name' => get_bloginfo( 'name' ),
		'og:title'     => $title,
		'og:url'       => $url,
		'og:locale'    => str_replace( '-', '_', get_bloginfo( 'language' ) ),
	);
	if ( $desc ) {
		$tags['og:description'] = $desc;
	}
	if ( $src ) {
		$tags['og:image']        = $src[0];
		$tags['og:image:width']  = (string) $src[1];
		$tags['og:image:height'] = (string) $src[2];
		if ( $alt ) {
			$tags['og:image:alt'] = $alt;
		}
	}
	foreach ( $tags as $property => $content ) {
		printf( '<meta property="%s" content="%s">' . "\n", esc_attr( $property ), esc_attr( $content ) );
	}
	printf( '<meta name="twitter:card" content="%s">' . "\n", $src ? 'summary_large_image' : 'summary' );

	if ( is_front_page() ) {
		$data = array(
			'@context'    => 'https://schema.org',
			'@type'       => 'WebPage',
			'name'        => $title,
			'url'         => $url,
			'description' => $desc,
			'about'       => array(
				'@type'         => 'Car',
				'name'          => 'BMW M6 Coupé (E63)',
				'brand'         => array(
					'@type' => 'Brand',
					'name'  => 'BMW',
				),
				'vehicleEngine' => array(
					'@type'       => 'EngineSpecification',
					'name'        => 'S85 V10',
					'enginePower' => array(
						'@type'    => 'QuantitativeValue',
						'value'    => 507,
						'unitText' => 'PS',
					),
				),
			),
		);
		if ( $src ) {
			$data['primaryImageOfPage'] = $src[0];
		}
		wp_print_inline_script_tag( wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ), array( 'type' => 'application/ld+json' ) );
	}
}
add_action( 'wp_head', 'msport_social_tags', 5 );
