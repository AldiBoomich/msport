/**
 * A light animated film grain over the pre-rendered film (video.js, frames.js): the Cycles frames are rendered
 * without grain, the live scene draws its own. CSS: main.css → .film-grain.
 *
 * @param {Element} after the element the grain goes after in the DOM
 * @return {HTMLElement}
 */
export function addGrain( after ) {
	const grain = document.createElement( 'div' );
	grain.className = 'film-grain';
	grain.setAttribute( 'aria-hidden', 'true' );
	grain.style.backgroundImage = `url(${ noise() })`;
	after.after( grain );
	return grain;
}

/** A small tile of film grain: light and dark specks, mostly transparent. */
function noise() {
	const c = document.createElement( 'canvas' );
	c.width = c.height = 128;
	const ctx = c.getContext( '2d' );
	const img = ctx.createImageData( 128, 128 );
	for ( let i = 0; i < img.data.length; i += 4 ) {
		const v = Math.random();
		const light = v > 0.5;
		img.data[ i ] = img.data[ i + 1 ] = img.data[ i + 2 ] = light ? 255 : 0;
		img.data[ i + 3 ] = Math.round( Math.abs( v - 0.5 ) * 2 * 9 );
	}
	ctx.putImageData( img, 0, 0 );
	return c.toDataURL( 'image/png' );
}
