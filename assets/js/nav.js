/**
 * Chapter rail and the phone menu.
 * - The rail marks the chapter under the middle of the screen (aria-current) and switches its ink on day chapters.
 * - On phones the "Menu" button opens the same list full screen: Esc and a link click close it, focus returns.
 */
export function initNav() {
	const rail = document.querySelector( '[data-rail]' );
	const toggle = document.querySelector( '[data-menu-toggle]' );
	if ( ! rail ) {
		return;
	}
	const links = [ ...rail.querySelectorAll( '[data-rail-link]' ) ];
	const chapters = links.map( ( a ) => document.getElementById( a.hash.slice( 1 ) ) ).filter( Boolean );
	const root = document.documentElement;

	// Current chapter: the one crossing a thin line in the middle of the viewport.
	if ( 'IntersectionObserver' in window && chapters.length ) {
		const io = new IntersectionObserver( ( entries ) => {
			for ( const e of entries ) {
				if ( ! e.isIntersecting ) {
					continue;
				}
				const id = e.target.id;
				links.forEach( ( a ) => a.setAttribute( 'aria-current', String( a.hash === '#' + id ) ) );
				root.classList.toggle( 'tone-day', e.target.classList.contains( 'ch--day' ) );
			}
		}, { rootMargin: '-50% 0px -50% 0px' } );
		chapters.forEach( ( c ) => io.observe( c ) );
	}

	if ( ! toggle ) {
		return;
	}
	const label = toggle.querySelector( '[data-menu-label]' );
	const setOpen = ( open ) => {
		root.classList.toggle( 'is-menu-open', open );
		toggle.setAttribute( 'aria-expanded', String( open ) );
		if ( label ) {
			label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
		}
	};
	toggle.addEventListener( 'click', () => {
		const open = toggle.getAttribute( 'aria-expanded' ) !== 'true';
		setOpen( open );
		if ( open ) {
			links[ 0 ]?.focus();
		}
	} );
	rail.addEventListener( 'click', ( e ) => {
		if ( e.target.closest( 'a' ) && root.classList.contains( 'is-menu-open' ) ) {
			setOpen( false );
		}
	} );
	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' && root.classList.contains( 'is-menu-open' ) ) {
			setOpen( false );
			toggle.focus();
		}
	} );
	window.matchMedia( '(min-width: 75em)' ).addEventListener?.( 'change', ( m ) => m.matches && setOpen( false ) );
}
