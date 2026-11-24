<?php
/**
 * Chapter 2, profile (night): the side profile rises over the ghost number; the figures come in at the end.
 * A sticky scene scrubbed by scroll (scenes.js → --p); stacked and static with reduced motion or without JS.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c       = $args;
$msport_img     = (int) msport_front( 'profile_image', 0 );
$msport_figures = msport_front( 'profile_figures', array() );
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night profile scene" data-chapter data-scene="profile" aria-label="<?php echo esc_attr( $msport_c['nav'] ); ?>">
	<div class="scene__sticky profile__stage">
		<p class="profile__ghost" aria-hidden="true"><span class="m-stripes"><i></i><i></i><i></i></span><span><?php echo esc_html( msport_front( 'profile_ghost', 'M6' ) ); ?></span></p>

		<?php if ( $msport_img ) : ?>
			<div class="profile__car">
				<?php
				msport_the_image(
					$msport_img,
					'msport-wide',
					array(
						'class' => 'profile__img',
						'sizes' => '(min-width: 75em) 70vw, 100vw',
					)
				);
				?>
			</div>
		<?php endif; ?>

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
