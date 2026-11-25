<?php
/**
 * Chapter 4, V10 (night) — the signature (DESIGN.md): the engine and its sound. The engine bay fills the screen
 * (the frame opens from an inset card as it comes in, scenes.js --rv); the heading and the lead sit on the photo top
 * left, the sound button bottom left: press it and the V10 recording plays, the photo lights up and a ring around the
 * button runs with the recording (power.js). The engine data as one fine line under the photo. Without JS: the native
 * player on the photo.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c     = $args;
$msport_specs = msport_front( 'power_specs', array() );
$msport_sound = msport_sound_url();
$msport_img   = (int) msport_front( 'power_image', 0 );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night power" data-chapter aria-labelledby="power-title">
	<div class="bleed engine" data-reveal data-engine>
		<div class="bleed__frame">
			<?php if ( $msport_img ) : ?>
				<?php
				msport_the_image(
					$msport_img,
					'msport-wide',
					array(
						'class' => 'bleed__img engine__img',
						'sizes' => '100vw',
					)
				);
				?>
			<?php endif; ?>
			<div class="engine__shade" aria-hidden="true"></div>

			<div class="container engine__over">
				<div class="power__head">
					<h2 id="power-title" class="h2 power__title"><?php echo msport_lines( msport_front( 'power_title', __( "Naturally aspirated.\nTen cylinders.", 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>
					<p class="lead power__lead"><?php echo esc_html( msport_front( 'power_lead' ) ); ?></p>
				</div>

				<?php if ( $msport_sound ) : ?>
					<div class="engine__sound">
						<button class="sound-btn js-only" type="button" aria-pressed="false" data-sound-btn>
							<span class="sound-btn__disc" aria-hidden="true">
								<svg class="sound-btn__play" viewBox="0 0 24 24" focusable="false"><path d="M8 5.5v13l10.5-6.5z"/></svg>
								<svg class="sound-btn__pause" viewBox="0 0 24 24" focusable="false"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
							</span>
							<span class="sound-btn__text">
								<span class="sound-btn__label"><?php echo esc_html( msport_front( 'power_button_label', __( 'Hear the V10', 'msport' ) ) ); ?></span>
								<span class="sound-btn__hint"><?php echo esc_html( msport_front( 'power_hint', __( 'Full throttle in a tunnel. Sound on.', 'msport' ) ) ); ?></span>
							</span>
						</button>
						<audio id="m6-sound" class="engine__audio" controls preload="none" src="<?php echo esc_url( $msport_sound ); ?>"></audio>
					</div>
				<?php endif; ?>
			</div>
		</div>
	</div>

	<?php if ( is_array( $msport_specs ) && $msport_specs ) : ?>
		<dl class="container spec-line">
			<?php foreach ( $msport_specs as $msport_row ) : ?>
				<div class="spec-line__item">
					<dt class="spec-line__label"><?php echo esc_html( $msport_row['label'] ?? '' ); ?></dt>
					<dd class="spec-line__value"><?php echo esc_html( $msport_row['value'] ?? '' ); ?><span class="spec-line__unit"><?php echo esc_html( empty( $msport_row['unit'] ) ? '' : ' ' . $msport_row['unit'] ); ?></span></dd>
				</div>
			<?php endforeach; ?>
		</dl>
	<?php endif; ?>
</section>
