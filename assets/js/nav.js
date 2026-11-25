/**
 * Chapter rail and the phone menu.
 * - The rail marks the chapter under the middle of the screen (aria-current) and takes the ink of what is behind it:
 *   dark on day chapters, light on night ones and on the dark photos inside day chapters.
 * - The header is type on the photo over the hero, the profile and the full-bleed photos, a solid bar elsewhere, in the tone of the
 *   chapter under it (.head-day); its button hides while the hero shows the same one.
 * - On phones the "Menu" button opens the same list full screen: Esc and a link click close it, focus returns.
 */
export function initNav() {
	const rail = document.querySelector( '[data-rail]' );
	const toggle = document.querySelector( '[data-menu-toggle]' );
	if ( ! rail ) {
		return;
	}
	// .is-scrolled: the header is not over a photo (hero, full-bleed); .head-day: a day chapter is under it. Its button
	// hides while the same button is on the first screen (no duplicate "Hear the V10").
	const hero = document.querySelector( '.hero' );
	const heroCta = document.querySelector( '.hero__cta' );
	const header = document.querySelector( '[data-header]' );
	{
		const photos = [ hero, ...document.querySelectorAll( '.profile, .bleed' ) ].filter( Boolean );
		const days = [ ...document.querySelectorAll( '.ch--day' ) ];
		const darks = [ ...document.querySelectorAll( '.bleed, .heritage__pair' ) ];
		let ticking = false;
		const update = () => {
			ticking = false;
			const h = header ? header.offsetHeight : 64;
			const at = ( y ) => ( el ) => {
				const r = el.getBoundingClientRect();
				return r.top <= y && r.bottom > y;
			};
			const under = at( h / 2 );
			const middle = at( window.innerHeight / 2 );
			document.documentElement.classList.toggle( 'tone-day', days.some( middle ) && ! darks.some( middle ) );
			// Text must not run under the see-through header: solid once the profile leaves or the engine heading comes up.
			const clear = ( el ) => {
				const r = el.getBoundingClientRect();
				return el.matches( '.profile' ) ? r.bottom >= window.innerHeight - 2 : ! el.matches( '.engine' ) || r.top > -h;
			};
			const overPhoto = photos.length ? photos.some( ( el ) => under( el ) && clear( el ) ) : window.scrollY < 8;
			document.documentElement.classList.toggle( 'is-scrolled', ! overPhoto );
			document.documentElement.classList.toggle( 'head-day', ! overPhoto && days.some( under ) );
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
