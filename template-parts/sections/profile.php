<?php
/**
 * Chapter 2, profile (night): the car stands in its studio (Porsche-like). Three layers in one frame: the studio photo,
 * the ghost badge, the same car cut out on the same canvas, so the badge stands behind the car and the car keeps its
 * own floor and reflections. Without the studio photo it is the cut-out alone. The figures come in at the end.
 * A sticky scene scrubbed by scroll (scenes.js → --p); stacked and static with reduced motion or without JS.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c       = $args;
$msport_img     = (int) msport_front( 'profile_image', 0 );
$msport_back    = (int) msport_front( 'profile_backdrop', 0 );
$msport_figures = msport_front( 'profile_figures', array() );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night profile scene" data-chapter data-scene="profile" aria-label="<?php echo esc_attr( $msport_c['nav'] ); ?>">
	<div class="scene__sticky profile__stage">
		<div class="profile__set<?php echo $msport_back ? ' has-studio' : ''; ?>">
			<?php
			if ( $msport_back ) {
				msport_the_image(
					$msport_back,
					'msport-wide',
					array(
						'class' => 'profile__studio',
						'alt'   => '',
						'sizes' => '(min-width: 48em) 100vw, 112vw',
					)
				);
			}
			?>
			<p class="profile__ghost" aria-hidden="true"><span class="m-stripes"><i></i><i></i><i></i></span><span><?php echo esc_html( msport_front( 'profile_ghost', 'M6' ) ); ?></span></p>
			<?php
			msport_the_image(
				$msport_img,
				'msport-wide',
				array(
					'class' => 'profile__img',
					'sizes' => '(min-width: 48em) 100vw, 112vw',
				)
			);
			?>
		</div>

		<?php if ( is_array( $msport_figures ) && $msport_figures ) : ?>
			<ul class="container figs" role="list">
				<?php foreach ( $msport_figures as $msport_i => $msport_fig ) : ?>
					<li class="fig" style="--i:<?php echo (int) $msport_i; ?>">
						<span class="fig__value"><?php echo esc_html( msport_number( $msport_fig['value'] ?? '' ) ); ?><span class="fig__unit">&nbsp;<?php echo esc_html( $msport_fig['unit'] ?? '' ); ?></span></span>
						<span class="fig__label"><?php echo esc_html( $msport_fig['label'] ?? '' ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
</section>
