/**
 * Site header: solid background after 80 px of scroll, full-screen mobile menu
 * (focus trapped, Esc closes, page behind is inert). No dependencies.
 */
( () => {
	const header = document.querySelector( '[data-header]' );
	if ( ! header ) {
		return;
	}

	// Solid header once the page has scrolled (DESIGN.md → Components → Header).
	const onScroll = () => header.classList.toggle( 'is-scrolled', window.scrollY > 80 );
	onScroll();
	window.addEventListener( 'scroll', onScroll, { passive: true } );

	const toggle = header.querySelector( '[data-menu-toggle]' );
	const menu = header.querySelector( '[data-menu]' );
	if ( ! toggle || ! menu ) {
		return;
	}

	const label = toggle.querySelector( '[data-menu-label]' );
	const desktop = window.matchMedia( '(min-width: 64em)' );
	const outside = () => document.querySelectorAll( 'body > :not(.site-header):not(script)' );
	const focusables = () =>
		[ toggle, ...menu.querySelectorAll( 'a[href], button:not([disabled])' ) ].filter(
			( el ) => el.offsetParent !== null
		);
	let returnFocus = true;

	const setOpen = ( open ) => {
		toggle.setAttribute( 'aria-expanded', String( open ) );
		header.classList.toggle( 'is-open', open );
		document.documentElement.classList.toggle( 'has-menu-open', open );
		label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
		outside().forEach( ( el ) => {
			el.inert = open;
		} );
		// the film's smooth scroll (src/film/boot.js) pauses while the overlay is open: overflow alone
		// does not stop a script-driven scroll
		document.dispatchEvent( new CustomEvent( 'msport:menu', { detail: { open } } ) );
		if ( open ) {
			const first = menu.querySelector( 'a[href]' );
			if ( first ) {
				first.focus();
			}
		} else if ( returnFocus ) {
			toggle.focus();
		}
		returnFocus = true;
	};

	const isOpen = () => toggle.getAttribute( 'aria-expanded' ) === 'true';

	toggle.addEventListener( 'click', () => setOpen( ! isOpen() ) );

	// A link was chosen: close and let the browser move focus to the anchor target.
	menu.addEventListener( 'click', ( event ) => {
		if ( isOpen() && event.target.closest( 'a' ) ) {
			returnFocus = false;
			setOpen( false );
		}
	} );

	document.addEventListener( 'keydown', ( event ) => {
		if ( ! isOpen() ) {
			return;
		}
		if ( event.key === 'Escape' ) {
			setOpen( false );
			return;
		}
		if ( event.key !== 'Tab' ) {
			return;
		}
		const items = focusables();
		const first = items[ 0 ];
		const last = items[ items.length - 1 ];
		if ( event.shiftKey && document.activeElement === first ) {
			event.preventDefault();
			last.focus();
		} else if ( ! event.shiftKey && document.activeElement === last ) {
			event.preventDefault();
			first.focus();
		}
	} );

	// Growing to desktop width closes the overlay.
	desktop.addEventListener( 'change', ( event ) => {
		if ( event.matches && isOpen() ) {
			returnFocus = false;
			setOpen( false );
		}
	} );
} )();
