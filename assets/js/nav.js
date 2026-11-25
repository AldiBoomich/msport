/**
 * Chapter rail and the phone menu.
 * - The rail marks the chapter under the middle of the screen (aria-current) and switches its ink on day chapters.
 * - The header is transparent over the hero and solid past it; its button hides while the hero shows the same one.
 * - On phones the "Menu" button opens the same list full screen: Esc and a link click close it, focus returns.
 */
export function initNav() {
	const rail = document.querySelector( '[data-rail]' );
	const toggle = document.querySelector( '[data-menu-toggle]' );
	if ( ! rail ) {
		return;
	}
	// The header is type on the photo while the hero is under it, a solid bar past it (.is-scrolled); its button hides
	// while the same button is on the first screen (no duplicate "Hear the V10").
	const hero = document.querySelector( '.hero' );
	const heroCta = document.querySelector( '.hero__cta' );
	const header = document.querySelector( '[data-header]' );
	{
		let ticking = false;
		const update = () => {
			ticking = false;
			const h = header ? header.offsetHeight : 64;
			const overHero = hero ? hero.getBoundingClientRect().bottom > h : window.scrollY < 8;
			document.documentElement.classList.toggle( 'is-scrolled', ! overHero );
			if ( heroCta ) {
				const r = heroCta.getBoundingClientRect();
				const onScreen = r.bottom > 0 && r.top < window.innerHeight && window.scrollY < window.innerHeight * 0.2;
				document.documentElement.classList.toggle( 'is-hero-cta', onScreen );
			}
		};
		window.addEventListener( 'scroll', () => {
			if ( ! ticking ) {
				ticking = true;
				requestAnimationFrame( update );
			}
		}, { passive: true } );
		update();
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
