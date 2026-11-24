/**
 * Trial (?film=video, boot.js): the pre-rendered Cycles film as video, played rather than scrubbed. The scroll
 * only picks where the film goes (a stop: video-timeline.js → STOPS, one per idle loop); the film then plays
 * there by itself at one steady pace whatever the scroll speed, and at the stop its idle loop keeps the car
 * driving. (User, 2026-11-24: scrubbed by a slow scroll the car moved "at 3 fps" and froze between moves.)
 *
 * - Down: the film plays forward, easing from 1× up to SPEED× and back down to 1× on arrival, so the car's
 *   pace meets the loop's. Up: the same on the film rendered backwards (cycles-pack.mjs --reverse; the car
 *   rolls back meanwhile, the user's choice). Turning round half-way swaps the files at the same picture.
 * - At a stop the film pauses and the loop fades in over it (the loops were rendered on their own, so their
 *   first frame is not the film's); leaving, the loop fades out as the film moves on.
 * - Far jumps (a menu link, a flick across chapters) dissolve straight to the stop; so does going back while
 *   the backwards film is still loading.
 * - The files are fetched whole (blobs): the preloader follows the forward film, the loops and the backwards
 *   film load after it. A keyframe every 8 frames keeps every seek at a few ms.
 * - Where the browser will not play video by itself (power saving), the film falls back to scrubbing.
 * - The HTML overlays (tachometer, gears) keep following the scroll (boot.js). A light grain lies over it all.
 * - `&speed=2` in the address tries another cruise speed (trial only).
 */
import { FRAMES, frameAt, loopAt, LOOP_LEN, STOPS, stopFor } from '../../tools/3d/video-timeline.js';
import { addGrain } from './grain.js';

const FPS = 30;
const ACCEL = 120; // frames/s², easing into and out of the cruise speed
const FAR = 320; // frames: a way longer than this dissolves instead of playing
const SETTLE = 150; // ms the far target must stay the same before the dissolve
const REST = 300; // ms, scrub fallback: still scroll before an idle loop starts
const LOAD_LIMIT = 10000;
const SPEED = ( () => {
	const v = Number( new URLSearchParams( location.search ).get( 'speed' ) );
	return v >= 1 && v <= 6 ? v : 2.5;
} )();

/**
 * Fetch a file whole as a blob URL, reporting the share downloaded.
 *
 * @param {string}    url
 * @param {?Function} onProgress 0…1
 * @return {Promise<string>}
 */
async function blobUrl( url, onProgress = null ) {
	const res = await fetch( url );
	if ( ! res.ok ) {
		throw new Error( `${ res.status } ${ url }` );
	}
	const total = Number( res.headers.get( 'content-length' ) ) || 0;
	if ( ! total || ! res.body || ! onProgress ) {
		return URL.createObjectURL( await res.blob() );
	}
	const reader = res.body.getReader();
	const parts = [];
	let got = 0;
	for ( ;; ) {
		const { done, value } = await reader.read();
		if ( done ) {
			break;
		}
		parts.push( value );
		got += value.length;
		onProgress( Math.min( 1, got / total ) );
	}
	return URL.createObjectURL( new Blob( parts, { type: res.headers.get( 'content-type' ) || 'video/mp4' } ) );
}

const makeVideo = ( cls ) => {
	const v = document.createElement( 'video' );
	v.className = cls;
	v.muted = true;
	v.playsInline = true;
	v.preload = 'auto';
	v.disablePictureInPicture = true;
	v.setAttribute( 'aria-hidden', 'true' );
	v.setAttribute( 'tabindex', '-1' );
	return v;
};

const once = ( el, name ) => new Promise( ( resolve, reject ) => {
	el.addEventListener( name, resolve, { once: true } );
	el.addEventListener( 'error', () => reject( el.error ), { once: true } );
} );

/** Seek a video; resolves when the frame is on screen (or after 600 ms, should `seeked` never come). */
const seekAt = ( el, seconds ) => {
	const done = once( el, 'seeked' );
	el.currentTime = seconds;
	return Promise.race( [ done, new Promise( ( resolve ) => setTimeout( resolve, 600 ) ) ] );
};

/** Show film frame f (forward or backwards file). */
const seekTo = ( el, f ) => seekAt( el, ( Math.max( 0, Math.min( FRAMES - 1, f ) ) + 0.5 ) / FPS );

const clampFrame = ( f ) => Math.max( 0, Math.min( FRAMES - 1, Math.round( f ) ) );

/**
 * @param {object}    o
 * @param {Function}  o.railAt     scroll position → { p, ft }
 * @param {?Function} o.onProgress 0…1, the preloader
 * @param {?Function} o.onLate     the load passed LOAD_LIMIT
 * @return {Promise<object|null>} the player once its first frame is shown, or null
 */
export async function goVideo( { railAt, onProgress = null, onLate = null } ) {
	const dataEl = document.getElementById( 'msport-film-data' );
	const data = dataEl ? JSON.parse( dataEl.textContent ) : null;
	if ( ! data?.video ) {
		return null;
	}
	const files = window.innerHeight > window.innerWidth ? data.video.port : data.video.land;
	const timer = setTimeout( () => onLate?.(), LOAD_LIMIT );

	// ---- the forward film, at the stop for the current scroll position
	const fwd = makeVideo( 'film-video' );
	fwd.src = await blobUrl( files.film, onProgress );
	document.body.prepend( fwd );
	await once( fwd, 'loadeddata' );
	const start = railAt( window.scrollY );
	let target = stopFor( start.p, start.ft, 0 );
	let pos = STOPS[ target ].frame; // where the film is, in forward frames
	await seekTo( fwd, pos );
	clearTimeout( timer );

	// DOM order: forward film, backwards film, loop, dissolve snapshot, grain
	const grain = addGrain( fwd );
	const rev = makeVideo( 'film-video film-video--rev' );
	const loop = makeVideo( 'film-video film-video--loop' );

	// ---- idle loops
	let loopsReady = false;
	let loopCount = 0;
	let loopOn = -1;
	let loopToken = 0;
	const setLoop = ( want ) => {
		const L = loopsReady && want >= 0 && want < loopCount ? want : -1;
		if ( L === loopOn ) {
			return;
		}
		loopOn = L;
		const token = ++loopToken;
		if ( L < 0 ) {
			loop.classList.remove( 'is-on' );
			setTimeout( () => token === loopToken && loop.pause(), 300 );
			return;
		}
		seekAt( loop, ( L * LOOP_LEN ) / FPS )
			.then( () => token === loopToken && loop.play() )
			.then( () => token === loopToken && loop.classList.add( 'is-on' ) )
			.catch( () => {
				// autoplay refused (battery saver): the frame simply rests
				loopsReady = false;
			} );
	};
	const loopWrap = () => {
		// wrap inside the loop's own stretch of the file
		if ( loopOn >= 0 && loop.currentTime >= ( ( loopOn + 1 ) * LOOP_LEN - 1 ) / FPS ) {
			loop.currentTime = ( loopOn * LOOP_LEN ) / FPS;
		}
	};

	// ---- motion
	let active = fwd; // the film on screen
	let moving = 0; // direction of travel, 0 at rest
	let speed = FPS; // film frames per second
	let op = 0; // token of the latest move or jump (seeks are async)
	let revReady = false;
	let canPlay = true; // false: the browser refused to play, scrub instead
	const posOf = ( el ) => ( el === rev ? FRAMES - 1 - ( el.currentTime * FPS - 0.5 ) : el.currentTime * FPS - 0.5 );
	const showRev = ( on ) => rev.classList.toggle( 'is-on', on );

	const arrive = () => {
		active.pause();
		active.playbackRate = 1;
		pos = posOf( active );
		moving = 0;
		speed = FPS;
		setLoop( STOPS[ target ].loop );
	};

	const go = async ( d ) => {
		const token = ++op;
		moving = 0;
		setLoop( -1 );
		const el = d > 0 ? fwd : rev;
		if ( el !== active ) {
			active.pause();
			await seekTo( el, d > 0 ? pos : FRAMES - 1 - pos );
			if ( token !== op ) {
				return;
			}
			showRev( d < 0 );
			active = el;
		}
		speed = FPS;
		el.playbackRate = 1;
		moving = d;
		el.play().catch( () => {
			if ( token === op ) {
				canPlay = false;
				moving = 0;
			}
		} );
	};

	// the picture as it is now, frozen over the films, fading out once the new one is in place
	const freeze = () => {
		const c = document.createElement( 'canvas' );
		c.className = 'film-video film-video--snap';
		c.width = fwd.videoWidth;
		c.height = fwd.videoHeight;
		const ctx = c.getContext( '2d' );
		ctx.drawImage( active, 0, 0, c.width, c.height );
		const a = loop.classList.contains( 'is-on' ) ? Number( getComputedStyle( loop ).opacity ) : 0;
		if ( a > 0 ) {
			ctx.globalAlpha = a;
			ctx.drawImage( loop, 0, 0, c.width, c.height );
		}
		grain.before( c );
		return () => {
			c.classList.add( 'is-gone' );
			setTimeout( () => c.remove(), 600 );
		};
	};

	const jump = async ( t ) => {
		const token = ++op;
		moving = 0;
		const release = freeze();
		active.pause();
		active.playbackRate = 1;
		showRev( false );
		active = fwd;
		pos = STOPS[ t ].frame; // so a new target meanwhile is measured from where the film lands
		loopOn = -1;
		loopToken++;
		loop.classList.remove( 'is-on' );
		loop.pause();
		try {
			await seekTo( fwd, STOPS[ t ].frame );
			if ( token === op ) {
				setLoop( STOPS[ t ].loop );
			}
		} finally {
			release();
		}
	};

	const step = ( dt ) => {
		if ( ! moving ) {
			return;
		}
		pos = posOf( active );
		const left = moving > 0 ? STOPS[ target ].frame - pos : pos - STOPS[ target ].frame;
		if ( left <= 0.5 ) {
			arrive();
			return;
		}
		// speed up to the cruise speed, and brake in time to arrive at 1× (v² = 30² + 2·a·distance)
		speed = Math.min( speed + ACCEL * dt, SPEED * FPS, Math.sqrt( FPS * FPS + 2 * ACCEL * left ) );
		const rate = Math.max( 1, speed / FPS );
		if ( Math.abs( active.playbackRate - rate ) > 0.01 ) {
			active.playbackRate = rate;
		}
	};

	// ---- the scrub fallback (the site's player before 2026-11-24)
	let seeking = false;
	let shown = -1;
	let want = -1;
	let moved = 0;
	const scrub = ( p, ft, now ) => {
		if ( active !== fwd ) {
			active.pause();
			showRev( false );
			active = fwd;
		}
		const w = clampFrame( frameAt( p, ft ) );
		if ( w !== want ) {
			want = w;
			moved = now;
		}
		if ( ! seeking && want !== shown ) {
			seeking = true;
			const f = want;
			seekTo( fwd, f ).then( () => ( shown = f ) ).finally( () => ( seeking = false ) );
		}
		setLoop( now - moved > REST && want === shown ? loopAt( p, ft ) : -1 );
	};

	// ---- loops first (needed at every stop), then the backwards film; neither is needed to start
	blobUrl( files.loops )
		.then( ( url ) => {
			loop.src = url;
			grain.before( loop );
			return once( loop, 'loadeddata' );
		} )
		.then( () => {
			loopCount = Math.round( ( loop.duration * FPS ) / LOOP_LEN );
			loopsReady = true;
			if ( ! moving && canPlay ) {
				setLoop( STOPS[ target ].loop );
			}
		} )
		.catch( () => loop.remove() )
		.then( () => ( files.reverse ? blobUrl( files.reverse ) : Promise.reject( new Error( 'no reverse film' ) ) ) )
		.then( ( url ) => {
			rev.src = url;
			fwd.after( rev );
			return once( rev, 'loadeddata' );
		} )
		.then( () => ( revReady = true ) )
		.catch( () => rev.remove() );

	let last = performance.now();
	let lastF = frameAt( start.p, start.ft );
	let dir = 0;
	let pending = -1; // a far stop waiting for the scroll to settle
	let pendingAt = 0;
	return {
		/** One step of the page loop (boot.js). @param {{p:number, ft:?number}} s */
		frame( { p, ft } ) {
			const now = performance.now();
			const dt = Math.min( 0.1, ( now - last ) / 1000 );
			last = now;
			const f = frameAt( p, ft );
			if ( Math.abs( f - lastF ) > 0.01 ) {
				dir = Math.sign( f - lastF );
				lastF = f;
			}
			if ( ! canPlay ) {
				scrub( p, ft, now );
				loopWrap();
				return;
			}
			const t = stopFor( p, ft, dir );
			const way = STOPS[ t ].frame - pos;
			const far = t !== target && ( Math.abs( way ) > FAR || ( way < -1 && ! revReady ) );
			if ( far ) {
				// a menu link scrolls through every chapter: dissolve once, when the target has settled
				if ( t !== pending ) {
					pending = t;
					pendingAt = now;
				} else if ( now - pendingAt > SETTLE ) {
					pending = -1;
					target = t;
					jump( t );
				}
			} else if ( t !== target || pending >= 0 ) {
				pending = -1;
				target = t;
				const d = Math.abs( way ) < 1 ? 0 : Math.sign( way );
				if ( d !== moving ) {
					if ( d === 0 ) {
						arrive();
					} else {
						go( d );
					}
				}
			}
			step( dt );
			loopWrap();
		},
		resize() {},
		dispose() {
			op++;
			[ fwd, rev, loop, grain ].forEach( ( el ) => el.remove() );
		},
	};
}
