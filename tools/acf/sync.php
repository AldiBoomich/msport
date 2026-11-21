<?php
// wp eval-file: imports the theme's acf-json groups into the database (same as ACF → Field Groups → Sync).
$dir = get_template_directory() . '/acf-json';
$all = array();
foreach ( glob( $dir . '/group_*.json' ) as $file ) {
	$group = json_decode( file_get_contents( $file ), true );
	$keys  = array();
	$walk  = function ( $fields ) use ( &$walk, &$keys ) {
		foreach ( $fields as $f ) {
			$keys[] = $f['key'];
			if ( ! empty( $f['sub_fields'] ) ) {
				$walk( $f['sub_fields'] );
			}
		}
	};
	$walk( $group['fields'] );
	$dupes = array_merge( array_diff_assoc( $keys, array_unique( $keys ) ), array_intersect( $keys, $all ) );
	$all   = array_merge( $all, $keys );
	if ( $dupes ) {
		WP_CLI::error( basename( $file ) . ' duplicate keys: ' . implode( ', ', $dupes ) );
	}
	$existing = get_posts( array( 'post_type' => 'acf-field-group', 'name' => $group['key'], 'post_status' => 'any', 'numberposts' => 1 ) );
	$existing = $existing ? array( 'ID' => $existing[0]->ID ) : null;
	if ( $existing ) {
		$group['ID'] = $existing['ID'];
	}
	// Do not write the JSON back while importing it.
	acf_update_setting( 'json', false );
	$result = acf_import_field_group( $group );
	acf_update_setting( 'json', true );
	WP_CLI::log( sprintf( '%s → ID %d, %d fields', $group['title'], $result['ID'], count( $keys ) ) );
}
