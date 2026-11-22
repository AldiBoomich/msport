/**
 * The 3D film, page side (DESIGN.md → Motion → How the 3D film works). Built into assets/js/film/ by
 * tools/build (npm run build there). Runs only when <html> has the `film` class (inc/film.php).
 *
 * - Lenis smooth scroll; same-page anchor links scroll with it.
 * - Scroll → camera: each chapter has a hold (its text frame is pinned, the camera rests on the chapter's
 *   key, ft runs 0…1) and a leg (the next frame slides in, the camera travels to the next key).
 *   The geometry comes from the layout itself (main.css → 8.0), measured on load and resize.
 * - After the hero still has painted, the Three.js scene (live.js, a separate chunk) loads; when its first
 *   frame is ready the stills fade out over it.
 * - Phones, and computers whose graphics cannot run the scene or hold it at ~50 fps in its first frames,
 *   get the same film pre-rendered as video (video.js): it fades in over the stills or the live canvas.
 *   If neither can run, the pinned stills stay: the film plays as pictures.
 * - The HTML overlays (tachometer, figures, gear readout: overlays.js) follow the same rail state in every
 *   one of those modes. The live scene also hears the V10 player: the heat haze grows while it plays.
 */
import Lenis from 'lenis';
import { createOverlays } from './overlays.js';

const root = document.documentElement;

// field prefix (inc/chapters.php) → key on the camera rail (tools/3d/chapters.js)
const RAIL = { hero: 0, front: 1, rev: 2, wheels: 3, gills: 4, roof: 5, sound: 6, smg: 7, spec: 8, outro: 9 };

if ( root.classList.contains( 'film' ) ) {
	start();
}

function start() {
	const lenis = new Lenis( { autoRaf: false, anchors: false } );

	// ---- layout → scroll geometry
	let zones = [];
	let viewH = window.innerHeight;
	const measure = () => {
		viewH = window.innerHeight;
		zones = [ ...document.querySelectorAll( '.film [data-chapter]' ) ]
			.filter( ( el ) => el.dataset.chapter in RAIL )
			.map( ( el ) => {
				const top = el.getBoundingClientRect().top + window.scrollY;
				const frame = el.classList.contains( 'chapter--film' ) ? el.querySelector( ':scope > .chapter__inner' ) : null;
				const frameH = frame ? frame.offsetHeight : viewH;
				const holdStart = top + Math.max( 0, frameH - viewH );
				return { el, rail: RAIL[ el.dataset.chapter ], top, holdStart, holdEnd: Math.max( holdStart, top + el.offsetHeight - viewH ) };
			} );
	};

	// scroll position → { p: rail position, ft: 0…1 inside a hold or null on a leg }
	const railAt = ( y ) => {
		if ( ! zones.length ) {
			return { p: 0, ft: 0 };
		}
		if ( y <= zones[ 0 ].holdStart ) {
			return { p: zones[ 0 ].rail, ft: 0 };
		}
		for ( let i = 0; i < zones.length; i++ ) {
			const z = zones[ i ];
			if ( y < z.holdEnd ) {
				return { p: z.rail, ft: ( y - z.holdStart ) / Math.max( 1, z.holdEnd - z.holdStart ) };
			}
			const next = zones[ i + 1 ];
			if ( next && y < next.holdStart ) {
				const t = ( y - z.holdEnd ) / Math.max( 1, next.holdStart - z.holdEnd );
				return { p: z.rail + ( next.rail - z.rail ) * t, ft: null };
			}
		}
		return { p: zones[ zones.length - 1 ].rail, ft: 1 };
	};

	// the canvas is fully hidden behind the opaque footer: skip drawing (the spec sheet is a see-through veil)
	const covers = [ ...document.querySelectorAll( '.site-footer' ) ];
	const hidden = () => covers.some( ( el ) => {
		const r = el.getBoundingClientRect();
		return r.top <= 0 && r.bottom >= viewH;
	} );

	// ---- anchors: same-page links scroll with Lenis to the top of the chapter
	document.addEventListener( 'click', ( event ) => {
		const a = event.target.closest( 'a[href*="#"]' );
		if ( ! a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey ) {
			return;
		}
		const url = new URL( a.href, location.href );
		if ( url.origin !== location.origin || url.pathname !== location.pathname || ! url.hash ) {
			return;
		}
		const target = document.getElementById( decodeURIComponent( url.hash.slice( 1 ) ) );
		if ( ! target ) {
			return;
		}
		event.preventDefault();
		lenis.scrollTo( target.getBoundingClientRect().top + window.scrollY, { duration: 1.6 } );
		history.pushState( null, '', url.hash );
		target.setAttribute( 'tabindex', '-1' );
		target.focus( { preventScroll: true } );
	} );

	// a link from another page (/#wheels): the browser lands a header height above the chapter (the
	// scroll-padding kept for keyboard focus); put it on the chapter's first frame instead
	if ( location.hash ) {
		const target = document.getElementById( decodeURIComponent( location.hash.slice( 1 ) ) );
		if ( target?.matches( '[data-chapter]' ) ) {
			window.addEventListener( 'load', () => lenis.scrollTo( target.getBoundingClientRect().top + window.scrollY, { immediate: true } ), { once: true } );
		}
	}

	// ---- one loop for scroll, overlays and film
	const overlays = createOverlays();
	const sound = document.getElementById( 'm6-sound' );
	let film = null;
	let video = null;
	let last = performance.now();
	// live scene speed check: the median of drawn frames 6…17, then of every next 90 (0.1 s clamps a
	// background tab; the median ignores single hitches)
	let drawn = 0;
	let times = [];
	const median = ( a ) => a.slice().sort( ( x, y ) => x - y )[ a.length >> 1 ];
	const tick = ( now ) => {
		const dt = Math.min( 0.1, ( now - last ) / 1000 );
		last = now;
		lenis.raf( now );
		const rail = railAt( window.scrollY );
		overlays.update( rail );
		if ( video ) {
			video.update( rail, now );
		} else if ( film ) {
			const draw = ! hidden();
			film.frame( { ...rail, dt, draw, sound: !! sound && ! sound.paused } );
			if ( draw && ++drawn > 5 && ! switching ) {
				times.push( dt );
				if ( times.length >= ( drawn < 30 ? 12 : 90 ) ) {
					if ( median( times ) > ( drawn < 30 ? 0.022 : 0.025 ) ) {
						toVideo().catch( () => {} ); // no video: the live scene stays (its own quality steps)
					}
					times = [];
				}
			}
		}
		requestAnimationFrame( tick );
	};
	requestAnimationFrame( tick );

	measure();
	let resizeTimer = 0;
	const onResize = () => {
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( () => {
			measure();
			film?.resize( window.innerWidth, window.innerHeight );
		}, 120 );
	};
	window.addEventListener( 'resize', onResize );
	new ResizeObserver( onResize ).observe( document.body );

	// ---- the live scene, after the hero still has painted
	const hero = document.querySelector( '.chapter--hero .chapter__still' );
	const afterLcp = () => new Promise( ( resolve ) => {
		const go = () => ( window.requestIdleCallback ? requestIdleCallback( resolve, { timeout: 1500 } ) : setTimeout( resolve, 200 ) );
		if ( ! hero || hero.complete ) {
			go();
		} else {
			hero.addEventListener( 'load', go, { once: true } );
			hero.addEventListener( 'error', go, { once: true } );
		}
	} );
	const showFilm = () => {
		root.classList.add( 'is-live' );
		setTimeout( () => root.classList.add( 'is-live-done' ), 450 );
	};
	const stay = ( error ) => {
		// eslint-disable-next-line no-console
		console.warn( 'msport film: staying on stills.', error );
	};

	// the video version: over the stills, or over the live canvas (which then fades out and is freed)
	let switching = false;
	const toVideo = () => {
		switching = true;
		const canvas = document.querySelector( '.film-canvas' );
		return import( './video.js' )
			.then( ( m ) => m.goVideo( { railAt, before: canvas } ) )
			.then( ( v ) => {
				if ( ! v ) {
					return;
				}
				video = v;
				root.classList.add( 'is-video' );
				if ( film ) {
					const old = film;
					film = null;
					canvas.classList.add( 'is-gone' );
					setTimeout( () => {
						old.dispose();
						canvas.remove();
					}, 450 );
				} else {
					showFilm();
				}
			} );
	};

	// phones always get the video: the live scene would cost their battery and resolution
	const phone = window.matchMedia( '(pointer: coarse)' ).matches && Math.min( screen.width, screen.height ) < 820;
	afterLcp()
		.then( () => {
			if ( phone ) {
				return toVideo();
			}
			return import( './live.js' )
				.then( ( m ) => m.goLive( { railAt, hero } ) )
				.catch( () => null )
				.then( ( f ) => {
					if ( ! f ) {
						return toVideo();
					}
					film = f;
					showFilm();
				} );
		} )
		.catch( stay );
}
