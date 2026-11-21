<?php
/**
 * Chapter 9: Spec sheet. One real <table> per group: label | value | unit.
 *
 * @package msport
 *
 * @var array $args Chapter: prefix, anchor, title, kind.
 */

defined( 'ABSPATH' ) || exit;

$msport_title  = msport_front( 'spec_title', $args['title'] );
$msport_groups = msport_front( 'spec_groups', array() );
$msport_source = msport_front( 'spec_source' );
?>
<section id="<?php echo esc_attr( $args['anchor'] ); ?>" class="chapter chapter--panel chapter--spec" data-chapter="spec">
	<div class="chapter__inner container">
		<h2 class="chapter__title"><?php echo esc_html( $msport_title ); ?></h2>
		<?php if ( $msport_groups ) : ?>
			<div class="spec">
				<?php foreach ( $msport_groups as $msport_group ) : ?>
					<?php
					if ( empty( $msport_group['rows'] ) ) {
						continue;
					}
					?>
					<table class="spec__table">
						<?php if ( ! empty( $msport_group['group_title'] ) ) : ?>
							<caption class="spec__caption"><?php echo esc_html( $msport_group['group_title'] ); ?></caption>
						<?php endif; ?>
						<tbody>
							<?php foreach ( $msport_group['rows'] as $msport_row ) : ?>
								<tr>
									<th scope="row"><?php echo esc_html( $msport_row['label'] ); ?></th>
									<td class="spec__value"><?php echo esc_html( $msport_row['value'] ); ?></td>
									<td class="spec__unit"><?php echo esc_html( $msport_row['unit'] ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
		<?php if ( $msport_source ) : ?>
			<p class="spec__source"><?php echo esc_html( $msport_source ); ?></p>
		<?php endif; ?>
	</div>
</section>
