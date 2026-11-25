<?php
/**
 * Chapter 6, spec sheet (night): tabs (tabs.js) with a diagonal wipe of the photo. Without JS: the groups are stacked.
 *
 * @package msport
 */

defined( 'ABSPATH' ) || exit;

$msport_c    = $args;
$msport_tabs = msport_front( 'specs_tabs', array() );
$msport_tabs = is_array( $msport_tabs ) ? array_values( $msport_tabs ) : array();
?>
<section id="<?php echo esc_attr( $msport_c['anchor'] ); ?>" class="ch ch--night specs" data-chapter aria-labelledby="specs-title">
	<div class="container">
		<h2 id="specs-title" class="h2"><?php echo msport_lines( msport_front( 'specs_title', __( 'Spec sheet', 'msport' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in msport_lines(). ?></h2>

		<?php if ( $msport_tabs ) : ?>
			<div class="tabs" data-tabs>
				<div class="tabs__list js-only" role="tablist" aria-labelledby="specs-title">
					<?php foreach ( $msport_tabs as $msport_i => $msport_tab ) : ?>
						<button class="tabs__tab" type="button" role="tab" id="spec-tab-<?php echo (int) $msport_i; ?>" aria-controls="spec-panel-<?php echo (int) $msport_i; ?>" aria-selected="<?php echo 0 === $msport_i ? 'true' : 'false'; ?>" tabindex="<?php echo 0 === $msport_i ? '0' : '-1'; ?>" data-tab><?php echo esc_html( $msport_tab['label'] ?? '' ); ?></button>
					<?php endforeach; ?>
				</div>

				<div class="tabs__panels">
					<?php foreach ( $msport_tabs as $msport_i => $msport_tab ) : ?>
						<div class="tabs__panel" id="spec-panel-<?php echo (int) $msport_i; ?>" role="tabpanel" aria-labelledby="spec-tab-<?php echo (int) $msport_i; ?>" data-panel>
							<h3 class="h3 tabs__title"><?php echo esc_html( $msport_tab['label'] ?? '' ); ?></h3>
							<?php if ( ! empty( $msport_tab['image'] ) ) : ?>
								<?php $msport_cut = msport_is_cutout( $msport_tab['image'] ); ?>
								<figure class="tabs__media<?php echo $msport_cut ? ' tabs__media--cut' : ''; ?>">
								<?php
								msport_the_image(
									$msport_tab['image'],
									'msport-wide',
									array(
										'class' => 'tabs__img',
										'sizes' => '(min-width: 62em) 54vw, 100vw',
									)
								);
								?>
								</figure>
							<?php endif; ?>
							<?php if ( ! empty( $msport_tab['rows'] ) && is_array( $msport_tab['rows'] ) ) : ?>
								<dl class="sheet">
									<?php foreach ( $msport_tab['rows'] as $msport_row ) : ?>
										<div class="sheet__row">
											<dt class="sheet__label"><?php echo esc_html( $msport_row['label'] ?? '' ); ?></dt>
											<dd class="sheet__value"><?php echo esc_html( $msport_row['value'] ?? '' ); ?></dd>
										</div>
									<?php endforeach; ?>
								</dl>
							<?php endif; ?>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		<?php endif; ?>
	</div>
</section>
