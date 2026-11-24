/**
 * Design hotspots (Ferrari-like): a hotspot opens its detail in the panel on the right while the car zooms into the
 * point. Close: the Close button, Esc, a click outside the panel. Focus moves into the panel and back to the hotspot.
 * Reduced motion: the panel opens without the zoom (CSS).
 */
export function initHotspots() {
	const stage = document.querySelector( '[data-hotspots]' );
	if ( ! stage ) {
		return;
	}
	const frame = stage.querySelector( '[data-zoom]' );
	const panel = stage.querySelector( '[data-details]' );
	const spots = [ ...stage.querySelectorAll( '[data-hotspot]' ) ];
	if ( ! frame || ! panel || ! spots.length ) {
		return;
	}
	const root = document.documentElement;
	let current = null;

	const close = ( returnFocus = true ) => {
		if ( ! current ) {
			return;
		}
		const spot = current;
		current = null;
		root.classList.remove( 'is-detail-open' );
		spot.setAttribute( 'aria-expanded', 'false' );
		panel.setAttribute( 'aria-hidden', 'true' );
		if ( returnFocus ) {
			spot.focus( { preventScroll: true } );
		}
	};

	const open = ( spot ) => {
		const detail = document.getElementById( spot.getAttribute( 'aria-controls' ) );
		if ( ! detail ) {
			return;
		}
		spots.forEach( ( s ) => s.setAttribute( 'aria-expanded', String( s === spot ) ) );
		panel.querySelectorAll( '[data-detail]' ).forEach( ( d ) => d.classList.toggle( 'is-active', d === detail ) );

		// Zoom origin = the point; shift so the point lands in the middle of the space left of the panel.
		const x = parseFloat( spot.style.getPropertyValue( '--x' ) ) || 50;
		const y = parseFloat( spot.style.getPropertyValue( '--y' ) ) || 50;
		frame.style.setProperty( '--zx', x + '%' );
		frame.style.setProperty( '--zy', y + '%' );
		const fr = frame.getBoundingClientRect();
		const pointX = fr.left + ( fr.width * x ) / 100;
		const free = window.innerWidth - Math.min( window.innerWidth, 560 );
		const shift = window.innerWidth >= 768 ? free / 2 - pointX : 0;
		frame.style.setProperty( '--zshift', Math.round( shift ) + 'px' );

		current = spot;
		panel.setAttribute( 'aria-hidden', 'false' );
		root.classList.add( 'is-detail-open' );
		requestAnimationFrame( () => detail.focus( { preventScroll: true } ) );
	};

	panel.setAttribute( 'aria-hidden', 'true' );
	spots.forEach( ( spot ) => spot.addEventListener( 'click', () => ( current === spot ? close() : open( spot ) ) ) );
	panel.addEventListener( 'click', ( e ) => {
		if ( e.target.closest( '[data-detail-close]' ) ) {
			close();
		}
	} );
	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' && current ) {
			close();
		}
	} );
	document.addEventListener( 'pointerdown', ( e ) => {
		if ( current && ! panel.contains( e.target ) && ! e.target.closest( '[data-hotspot]' ) ) {
			close( false );
		}
	} );
	// Leaving the chapter closes the panel.
	if ( 'IntersectionObserver' in window ) {
		new IntersectionObserver( ( entries ) => {
			if ( entries.every( ( en ) => ! en.isIntersecting ) ) {
				close( false );
			}
		} ).observe( stage );
	}
}
