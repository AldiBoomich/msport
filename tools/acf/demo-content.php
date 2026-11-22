<?php
// wp eval-file: demo content for M6 Settings, the front page chapters and the privacy page.
$front = (int) get_option( 'page_on_front' );
if ( ! $front ) {
	WP_CLI::error( 'No static front page.' );
}
$k = static function ( $name ) {
	return 'field_msport_' . $name;
};

// ------------------------------------------------------------- M6 Settings
$options = array(
	'opt_wordmark'          => 'M6 E63',
	'opt_header_cta_label'  => 'Hear the V10',
	'opt_header_cta_anchor' => 'sound',
	'opt_menu_label'        => 'Menu',
	'opt_menu_close_label'  => 'Close',
	'opt_skip_label'        => 'Skip to content',
	'opt_nav_label'         => 'Chapters',
	'opt_dev_name'          => 'Aldi1988',
	'opt_dev_url'           => 'https://www.upwork.com/freelancers/~017b6f99b455548c2c',
	'opt_social'            => array(
		array(
			'label' => 'GitHub',
			'url'   => 'https://github.com/AldiBoomich',
		),
		array(
			'label' => 'Upwork',
			'url'   => 'https://www.upwork.com/freelancers/~017b6f99b455548c2c',
		),
	),
	'opt_footer_nav_label'  => 'Footer',
	'opt_sound_credit'      => '',
	'opt_effects_enabled'   => 1,
	'opt_404_title'         => 'You hit the limiter.',
	'opt_404_text'          => 'This page does not exist. The car is still running on the front page.',
	'opt_404_button'        => 'Back to the car',
	'opt_empty_title'       => 'Nothing here yet',
	'opt_meta_description'  => 'The BMW M6 E63 and its 8,250 rpm V10, told as one scroll-driven 3D film. A hand-built WordPress theme, every word editable in the admin.',
);
foreach ( $options as $name => $value ) {
	update_field( $k( $name ), $value, 'option' );
}

// ------------------------------------------------------------- Front page
$fields = array(
	'hero_title'                => 'Ten cylinders. 8,250 rpm.',
	'hero_text'                 => 'BMW M6 E63, 2005–2010: a 5.0-litre V10 without turbochargers, a carbon roof and a seven-speed SMG gearbox, shown by one car driving through the night.',
	'hero_cta_label'            => 'See the spec sheet',
	'hero_cta_anchor'           => 'specs',

	'scene_paint'               => '#050608',
	'scene_clearcoat_roughness' => 0.012,
	'scene_speed'               => 1,
	'scene_model_credit'        => '3D model “BMW M6 (E63)” by Mona x Supercars, CC BY 4.0.',

	'front_title'               => 'Nose and lights',
	'front_text'                => "A shark nose, wide twin kidneys and a power dome on the long bonnet.\nAt night you recognise the M6 by its corona rings long before you can read the badge.",

	'rev_title'                 => 'The S85 V10',
	'rev_text'                  => "Five litres, ten cylinders at 90 degrees, one throttle body per cylinder and no turbochargers.\nPeak power arrives at 7,750 rpm, and the needle keeps climbing to 8,250. BMW built it with lessons from its Formula One V10 programme.",
	'rev_idle'                  => 800,
	'rev_redzone_start'         => 7500,
	'rev_redline'               => 8250,
	'rev_figures'               => array(
		array( 'value' => 507, 'unit' => 'PS', 'label' => 'Power', 'at_rpm' => 7750 ),
		array( 'value' => 520, 'unit' => 'Nm', 'label' => 'Torque', 'at_rpm' => 6100 ),
		array( 'value' => 8250, 'unit' => 'rpm', 'label' => 'Redline', 'at_rpm' => 8250 ),
	),
	'rev_sound_label'           => 'Play the V10',
	'rev_tacho_scale'           => '×1000 rpm',
	'rev_tacho_unit'            => 'rpm',
	'rev_tacho_title'           => 'Tachometer: the needle at {redline} rpm, red zone from {redzone} rpm.',

	'wheels_title'              => 'Wheels and brakes',
	'wheels_text'               => '19-inch M double-spoke wheels, 255 tyres at the front and 285 at the rear. Behind them sit cross-drilled compound discs: 374 mm at the front, 370 mm at the rear.',
	'wheels_numbers'            => array(
		array( 'value' => '4.6', 'unit' => 's', 'label' => '0–100 km/h', 'note' => '' ),
		array( 'value' => '250', 'unit' => 'km/h', 'label' => 'Top speed', 'note' => 'Electronically limited.' ),
		array( 'value' => '374', 'unit' => 'mm', 'label' => 'Front brake discs', 'note' => '' ),
	),

	'gills_title'               => 'Gills',
	'gills_text'                => 'Air outlets behind the front wheels let hot air out of the wheel arches and carry the M badge. One sharp line along the flank, picked up by every street light the car passes.',

	'roof_title'                => 'Carbon roof',
	'roof_text'                 => 'The roof panel is carbon-fibre reinforced plastic. It is lighter than steel and sits at the highest point of the car, so it lowers the centre of gravity. The weave stays visible under the clear coat.',

	'sound_title'               => 'Tail and sound',
	'sound_text'                => 'Four exhaust tips, two on each side. At idle the V10 is calm; above 6,000 rpm its voice turns hard and high. Turn the sound on and hear one pull to the limiter.',
	'sound_play_label'          => 'Play the V10',
	'sound_pause_label'         => 'Pause',

	'smg_title'                 => 'SMG III',
	'smg_text'                  => 'Seven gears, an automated clutch and paddles behind the wheel. In its fastest program a shift takes 65 milliseconds.',
	'smg_gears'                 => array(
		array( 'gear' => '1', 'line' => 'Launch Control holds the revs and lets the clutch in for you.' ),
		array( 'gear' => '2', 'line' => 'The rear tyres search for grip; the traction control lets them.' ),
		array( 'gear' => '3', 'line' => 'Full torque, 520 Nm, at 6,100 rpm.' ),
		array( 'gear' => '4', 'line' => 'Upshift at 8,250 rpm in 65 milliseconds.' ),
		array( 'gear' => '5', 'line' => 'Motorway speed, and the needle is only halfway round.' ),
		array( 'gear' => '6', 'line' => 'The V10 settles into a long, even pull.' ),
		array( 'gear' => '7', 'line' => 'Cruising gear. The limiter waits at 250 km/h.' ),
	),

	'spec_title'                => 'Spec sheet',
	'spec_groups'               => array(
		array(
			'group_title' => 'Engine',
			'rows'        => array(
				array( 'label' => 'Type', 'value' => 'V10, 90°, S85B50', 'unit' => '' ),
				array( 'label' => 'Displacement', 'value' => '4,999', 'unit' => 'cm³' ),
				array( 'label' => 'Bore × stroke', 'value' => '92.0 × 75.2', 'unit' => 'mm' ),
				array( 'label' => 'Compression', 'value' => '12.0 : 1', 'unit' => '' ),
				array( 'label' => 'Power', 'value' => '507 (373 kW) at 7,750', 'unit' => 'PS / rpm' ),
				array( 'label' => 'Torque', 'value' => '520 at 6,100', 'unit' => 'Nm / rpm' ),
				array( 'label' => 'Redline', 'value' => '8,250', 'unit' => 'rpm' ),
			),
		),
		array(
			'group_title' => 'Transmission',
			'rows'        => array(
				array( 'label' => 'Gearbox', 'value' => 'SMG III, 7-speed', 'unit' => '' ),
				array( 'label' => 'Drive', 'value' => 'Rear wheels', 'unit' => '' ),
				array( 'label' => 'Differential', 'value' => 'M variable differential lock', 'unit' => '' ),
			),
		),
		array(
			'group_title' => 'Performance',
			'rows'        => array(
				array( 'label' => '0–100 km/h', 'value' => '4.6', 'unit' => 's' ),
				array( 'label' => 'Top speed', 'value' => '250 (limited)', 'unit' => 'km/h' ),
			),
		),
		array(
			'group_title' => 'Body and chassis',
			'rows'        => array(
				array( 'label' => 'Length', 'value' => '4,871', 'unit' => 'mm' ),
				array( 'label' => 'Width', 'value' => '1,855', 'unit' => 'mm' ),
				array( 'label' => 'Height', 'value' => '1,372', 'unit' => 'mm' ),
				array( 'label' => 'Wheelbase', 'value' => '2,781', 'unit' => 'mm' ),
				array( 'label' => 'Weight (DIN)', 'value' => '1,710', 'unit' => 'kg' ),
				array( 'label' => 'Roof', 'value' => 'Carbon-fibre reinforced plastic', 'unit' => '' ),
				array( 'label' => 'Tyres, front / rear', 'value' => '255/40 ZR19 / 285/35 ZR19', 'unit' => '' ),
				array( 'label' => 'Brake discs, front / rear', 'value' => '374 / 370', 'unit' => 'mm' ),
			),
		),
	),
	'spec_source'               => 'Figures: BMW M6 Coupé (E63), European version, factory data.',

	'outro_title'               => 'End of the run.',
	'outro_text'                => "This page is a portfolio project: a hand-built WordPress theme with a real-time 3D car, and every word on it is editable in the admin.
If you need a site like this for your product, get in touch.",
	'outro_cta_label'           => 'Get in touch',
	'outro_cta_link'            => '',
);
foreach ( $fields as $name => $value ) {
	update_field( $k( $name ), $value, $front );
}

// Show / anchor / focal defaults are saved too, so the editor sees real values in every tab.
$anchors = array( 'hero' => 'top', 'front' => 'front', 'rev' => 'rev', 'wheels' => 'wheels', 'gills' => 'gills', 'roof' => 'roof', 'sound' => 'sound', 'smg' => 'smg', 'spec' => 'specs', 'outro' => 'contact' );
foreach ( $anchors as $prefix => $anchor ) {
	update_field( $k( $prefix . '_show' ), 1, $front );
	update_field( $k( $prefix . '_anchor' ), $anchor, $front );
	if ( 'spec' !== $prefix ) {
		update_field( $k( $prefix . '_focal' ), '50% 50%', $front );
	}
}

// ------------------------------------------------------------- Privacy page
$privacy = (int) get_option( 'wp_page_for_privacy_policy' );
if ( $privacy ) {
	$content = <<<'HTML'
<!-- wp:paragraph -->
<p>This site is a portfolio project that presents the BMW M6 E63. It sells nothing, has no forms and collects no personal data from visitors.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Cookies and tracking</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>The site sets no advertising or analytics cookies and loads no third-party trackers. Fonts, the 3D model and the engine sound are served from this site.</p>
<!-- /wp:paragraph -->

HTML;
	wp_update_post(
		array(
			'ID'           => $privacy,
			'post_title'   => 'Privacy Policy',
			'post_name'    => 'privacy-policy',
			'post_content' => $content,
			'post_status'  => 'publish',
		)
	);
}

WP_CLI::success( sprintf( 'Options: %d, front page fields: %d, privacy page: %d', count( $options ), count( $fields ), $privacy ) );
