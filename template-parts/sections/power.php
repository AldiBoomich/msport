<?php
/**
 * Chapter 4, V10 / POWER (night) — the signature (DESIGN.md). P400 on start; POWER lights the LED, rolls the output to
 * P500 and runs the needle with the recording (power.js). Without JS: P500 is shown and the native player plays the sound.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c     = $args;
$msport_specs = msport_front( 'power_specs', array() );
$msport_from  = (int) msport_front( 'power_from', 400 );
$msport_to    = (int) msport_front( 'power_to', 507 );
$msport_off   = (string) msport_front( 'power_mode_off', 'P400' );
$msport_on    = (string) msport_front( 'power_mode_on', 'P500' );
$msport_sound = msport_sound_url();
$msport_curve = trim( (string) msport_option( 'opt_rpm_curve', '' ) );
$msport_curve = $msport_curve && null !== json_decode( $msport_curve ) ? $msport_curve : '';
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night power" data-chapter aria-labelledby="power-title">
	<div class="container power__grid">
		<div class="power__copy">
			<h2 id="power-title" class="h2 stepped"><?php echo msport_lines( msport_front( 'power_title', __( "Ten cylinders.\n8,250 rpm.", 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
			<p class="lead power__lead"><?php echo esc_html( msport_front( 'power_lead' ) ); ?></p>
			<?php if ( is_array( $msport_specs ) && $msport_specs ) : ?>
				<dl class="facts">
					<?php foreach ( $msport_specs as $msport_row ) : ?>
						<div class="facts__row">
							<dt class="facts__label"><?php echo esc_html( $msport_row['label'] ?? '' ); ?></dt>
							<dd class="facts__value"><?php echo esc_html( $msport_row['value'] ?? '' ); ?><span class="facts__unit"><?php echo esc_html( empty( $msport_row['unit'] ) ? '' : ' ' . $msport_row['unit'] ); ?></span></dd>
						</div>
					<?php endforeach; ?>
				</dl>
			<?php endif; ?>
		</div>

		<div class="instrument" data-power data-from="<?php echo esc_attr( $msport_from ); ?>" data-to="<?php echo esc_attr( $msport_to ); ?>" data-mode-off="<?php echo esc_attr( $msport_off ); ?>" data-mode-on="<?php echo esc_attr( $msport_on ); ?>"<?php echo $msport_curve ? ' data-curve="' . esc_attr( $msport_curve ) . '"' : ''; ?>>
			<?php
			echo msport_tachometer( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside.
				(int) msport_front( 'power_idle', 800 ),
				(int) msport_front( 'power_redline', 8250 ),
				(int) msport_front( 'power_scale_max', 9000 )
			);
			?>
			<p class="output" aria-live="polite">
				<span class="output__mode" data-power-mode><?php echo esc_html( $msport_on ); ?></span>
				<span class="output__value"><span data-power-value><?php echo esc_html( msport_number( $msport_to ) ); ?></span>&nbsp;<span class="output__unit"><?php echo esc_html( msport_front( 'power_unit', 'PS' ) ); ?></span></span>
			</p>
			<div class="instrument__controls">
				<button class="power-key js-only" type="button" aria-pressed="false" data-power-key>
					<span class="power-key__led" aria-hidden="true"></span>
					<?php echo esc_html( msport_front( 'power_button_label', 'POWER' ) ); ?>
				</button>
				<p class="instrument__hint js-only" data-power-hint><?php echo esc_html( msport_front( 'power_hint', __( 'Press POWER. Sound on.', 'msport' ) ) ); ?></p>
			</div>
			<?php if ( $msport_sound ) : ?>
				<audio id="m6-sound" class="instrument__audio" controls preload="none" src="<?php echo esc_url( $msport_sound ); ?>"></audio>
			<?php endif; ?>
		</div>
	</div>

	<?php if ( msport_front( 'power_image' ) ) : ?>
		<figure class="power__photo">
		<?php
		msport_the_image(
			msport_front( 'power_image' ),
			'msport-wide',
			array(
				'class' => 'power__img',
				'sizes' => '100vw',
			)
		);
		?>
		</figure>
	<?php endif; ?>
</section>
