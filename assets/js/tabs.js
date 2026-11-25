/**
 * Spec sheet tabs (WAI-ARIA tabs, automatic activation): click or arrow keys / Home / End switch the panel; the new
 * panel plays the diagonal wipe (CSS .is-entering). On phones the tab list scrolls sideways and the chosen tab is
 * brought to its middle. Without JS all groups are shown stacked.
 * The photos of the hidden panels are lazy; they are fetched when the section comes near, so the wipe never opens on an
 * empty frame.
 */
export function initTabs() {
	document.querySelectorAll( '[data-tabs]' ).forEach( ( box ) => {
		const tabs = [ ...box.querySelectorAll( '[data-tab]' ) ];
		const panels = [ ...box.querySelectorAll( '[data-panel]' ) ];
		if ( ! tabs.length ) {
			return;
		}
		panels.forEach( ( p ) => p.querySelectorAll( '.sheet__row' ).forEach( ( r, i ) => r.style.setProperty( '--i', i ) ) );

		const select = ( i, focus = false ) => {
			tabs.forEach( ( t, n ) => {
				t.setAttribute( 'aria-selected', String( n === i ) );
				t.tabIndex = n === i ? 0 : -1;
			} );
			panels.forEach( ( p, n ) => {
				const was = ! p.hidden;
				p.hidden = n !== i;
				if ( n === i && ! was ) {
					p.classList.remove( 'is-entering' );
					void p.offsetWidth; // restart the wipe
					p.classList.add( 'is-entering' );
				}
			} );
			if ( focus ) {
				tabs[ i ].focus( { preventScroll: true } );
			}
			reveal( tabs[ i ] );
		};

		// On phones the tab list is a sideways strip: bring the chosen tab to its middle (the page itself stays put).
		const list = tabs[ 0 ].parentElement;
		const calm = window.matchMedia( '(prefers-reduced-motion: reduce)' );
		const reveal = ( t ) => {
			if ( list.scrollWidth <= list.clientWidth ) {
				return;
			}
			const lr = list.getBoundingClientRect();
			const tr = t.getBoundingClientRect();
			const left = list.scrollLeft + tr.left - lr.left - ( list.clientWidth - tr.width ) / 2;
			list.scrollTo( { left, behavior: calm.matches ? 'auto' : 'smooth' } );
		};

		tabs.forEach( ( t, i ) => {
			t.addEventListener( 'click', () => select( i ) );
			t.addEventListener( 'keydown', ( e ) => {
				const last = tabs.length - 1;
				const map = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last };
				if ( e.key in map ) {
					e.preventDefault();
					select( map[ e.key ], true );
				}
			} );
		} );

		panels.forEach( ( p, n ) => ( p.hidden = n !== 0 ) );

		const preload = () => box.querySelectorAll( 'img[loading="lazy"]' ).forEach( ( img ) => ( img.loading = 'eager' ) );
		if ( 'IntersectionObserver' in window ) {
			const io = new IntersectionObserver(
				( entries ) => {
					if ( entries.some( ( e ) => e.isIntersecting ) ) {
						preload();
						io.disconnect();
					}
				},
				{ rootMargin: '800px 0px' }
			);
			io.observe( box );
		} else {
			preload();
		}
	} );
}
