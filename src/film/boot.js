/**
 * The 3D film, page side (DESIGN.md → Motion → How the 3D film works). Built into assets/js/film/ by
 * tools/build (npm run build there). Runs only when <html> has the `film` class (inc/film.php).
 *
 * - Lenis smooth scroll; same-page anchor links scroll with it.
 * - Scroll → camera: each chapter has a hold (its text frame is pinned, the camera rests on the chapter's
 *   key, ft runs 0…1) and a leg (the next frame slides in, the camera travels to the next key).
 *   The geometry comes from the layout itself (main.css → 8.0), measured on load and resize.
 * - The Three.js scene (live.js, a separate chunk) loads straight away on every screen, behind a preloader
 *   whose rev gauge follows the download; when its first frame is drawn the preloader fades out (after 10 s
 *   it gives way to the stills and the scene fades in over them later). Weak graphics lower their own
 *   quality step by step (film-scene.js). Where it cannot run (software rendering, a failed load) the
 *   preloader goes and the pinned stills stay: the film plays as pictures.
 * - The HTML overlays (tachometer, figures, gear readout: overlays.js) follow the same rail state in every
 *   modes (live scene or stills). The live scene also hears the V10 player: the heat haze grows while it plays.
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
	// Trial versions for the user's side-by-side (2026-11-24), one per link: ?film=live (live scene with the
	// v6 car), ?film=video (the Cycles film, played from stop to stop), ?film=frames (the Cycles film as a frame
	// sequence on a canvas). Without it the site stays as it is.
	const mode = new URLSearchParams( location.search ).get( 'film' );
	const lenis = new Lenis( { autoRaf: false, anchors: false } );
	// the mobile menu covers the page (header.js): no scrolling behind it; sent synchronously, so a menu
	// link restarts the scroll before its anchor jump below
	document.addEventListener( 'msport:menu', ( event ) => ( event.detail.open ? lenis.stop() : lenis.start() ) );

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
		// the played film rests only inside a chapter's hold: land where its frame is pinned
		const zone = mode === 'video' ? zones.find( ( z ) => z.el === target ) : null;
		lenis.scrollTo( zone ? zone.holdStart : target.getBoundingClientRect().top + window.scrollY, { duration: 1.6 } );
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

	// ---- the played film (?film=video): a scroll left resting between two chapters glides on to the next one
	// in the direction it went, so the text and the picture (heading there by itself) always match. Any wheel
	// or touch takes over again (Lenis).
	let snapY = window.scrollY;
	let snapDir = 0;
	let still = performance.now();
	let snapUntil = 0;
	let touching = false;
	if ( mode === 'video' ) {
		window.addEventListener( 'touchstart', () => ( touching = true ), { passive: true } );
		[ 'touchend', 'touchcancel' ].forEach( ( e ) => window.addEventListener( e, () => ( touching = false ), { passive: true } ) );
	}
	const glide = ( t ) => ( t < 0.5 ? 4 * t * t * t : 1 - ( ( -2 * t + 2 ) ** 3 ) / 2 );
	const snap = ( y, now ) => {
		if ( Math.abs( y - snapY ) > 0.5 ) {
			snapDir = Math.sign( y - snapY );
			snapY = y;
			still = now;
			return;
		}
		if ( touching || lenis.isStopped || now < snapUntil || now - still < 150 ) {
			return;
		}
		for ( let i = 0; i < zones.length - 1; i++ ) {
			const a = zones[ i ].holdEnd;
			const b = zones[ i + 1 ].holdStart;
			if ( y > a + 1 && y < b - 1 ) {
				let to = y - a < b - y ? a : b;
				if ( snapDir ) {
					to = snapDir > 0 ? b : a;
				}
				snapUntil = now + 1100;
				lenis.scrollTo( to, { duration: 0.9, easing: glide } );
				return;
			}
		}
	};

	// ---- one loop for scroll, overlays and film
	const overlays = createOverlays();
	const sound = document.getElementById( 'm6-sound' );
	let film = null;
	let last = performance.now();
	const tick = ( now ) => {
		const dt = Math.min( 0.1, ( now - last ) / 1000 ); // 0.1 s clamps a background tab
		last = now;
		lenis.raf( now );
		if ( mode === 'video' && film ) {
			snap( window.scrollY, now );
		}
		const rail = railAt( window.scrollY );
		overlays.update( rail );
		if ( film ) {
			film.frame( { ...rail, dt, draw: ! hidden(), sound: !! sound && ! sound.paused } );
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

	// ---- the live scene, loaded straight away behind the preloader (inc/film.php prints it; the head script
	// adds `film-loading` and takes it away itself after 15 s, should this module never run)
	const gauge = createGauge( document.querySelector( '[data-film-loader]' ) );
	const ready = () => {
		gauge.set( 1 );
		setTimeout( () => root.classList.remove( 'film-loading' ), 350 ); // let the needle reach the top
	};
	const showFilm = () => {
		root.classList.add( 'is-live' );
		setTimeout( () => root.classList.add( 'is-live-done' ), 450 );
	};
	const stay = ( error ) => {
		// eslint-disable-next-line no-console
		console.warn( 'msport film: staying on stills.', error ?? '' );
		root.classList.remove( 'film-loading' );
	};

	// every screen gets the live scene (user's decision, 2026-11-24: no video); weak graphics step their own
	// quality down (film-scene.js → adaptive). Software rendering or a failed load: the stills stay. A slow
	// load (10 s): the preloader gives way to the stills and the scene fades in over them when it is ready.
	// trial versions: see `mode` at the top
	const load = {
		video: () => import( './video.js' ).then( ( m ) => m.goVideo ),
		frames: () => import( './frames.js' ).then( ( m ) => m.goFrames ),
	}[ mode ] ?? ( () => import( './live.js' ).then( ( m ) => ( o ) => m.goLive( { ...o, v6: mode === 'live' } ) ) );
	gauge.set( 0.04 );
	load()
		.then( ( go ) => {
			gauge.set( 0.1 );
			return go( { railAt, onProgress: ( f ) => gauge.set( 0.1 + 0.8 * f ), onLate: () => root.classList.remove( 'film-loading' ) } );
		} )
		.then( ( f ) => {
			if ( ! f ) {
				return stay();
			}
			film = f;
			showFilm();
			ready();
		} )
		.catch( stay );
}

/**
 * The preloader's rev gauge: the bar and the rpm figure ease towards the share loaded (0…1 → 0…8,250 rpm).
 *
 * @param {HTMLElement|null} el
 * @return {{set: (f: number) => void}}
 */
function createGauge( el ) {
	if ( ! el ) {
		return { set: () => {} };
	}
	const bar = el.querySelector( '[data-film-loader-bar]' );
	const rpm = el.querySelector( '[data-film-loader-rpm]' );
	const max = Number( el.dataset.max ) || 8250;
	const fmt = new Intl.NumberFormat( document.documentElement.lang || 'en' );
	let shown = 0;
	let target = 0;
	let raf = 0;
	const step = () => {
		shown += ( target - shown ) * 0.18;
		if ( Math.abs( target - shown ) < 0.002 ) {
			shown = target;
		}
		bar.style.transform = `scaleX(${ shown.toFixed( 4 ) })`;
		rpm.textContent = fmt.format( Math.round( ( shown * max ) / 10 ) * 10 );
		raf = shown === target ? 0 : requestAnimationFrame( step );
	};
	return {
		set( f ) {
			target = Math.max( target, Math.min( 1, f ) );
			if ( ! raf ) {
				raf = requestAnimationFrame( step );
			}
		},
	};
}
