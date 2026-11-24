/**
 * Trial (?film=video, boot.js): the pre-rendered Cycles film as one video scrubbed by the scroll — the player
 * the site had on 2026-11-24 (commit a95e293), now behind the preloader and with the full-quality encodes
 * (cycles-pack.mjs, CRF 24) from uploads/msport-film/video/.
 *
 * - The film is fetched whole (a blob, the preloader follows the download), so any frame can be shown at
 *   once: a keyframe every 8 frames keeps a seek at ~5 ms, also on integrated graphics.
 * - When the scroll rests inside a chapter, a seamless idle loop (road, wheels, street lamps moving) fades
 *   in over the still frame and fades out when the scroll moves again (video-timeline.js → LOOPS).
 * - A light animated grain lies over it (grain.js).
 */
import { FRAMES, frameAt, loopAt, LOOP_LEN } from '../../tools/3d/video-timeline.js';
import { addGrain } from './grain.js';

const FPS = 30;
const REST = 300; // ms without scroll before an idle loop starts
const LOAD_LIMIT = 10000;

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

	const main = makeVideo( 'film-video' );
	main.src = await blobUrl( files.film, onProgress );
	document.body.prepend( main );
	await once( main, 'loadeddata' );

	let shown = -1;
	let want = -1;
	let pending = -1;
	let seeking = false;
	let moved = 0;
	const seek = ( f ) => {
		seeking = true;
		pending = f;
		main.currentTime = ( f + 0.5 ) / FPS;
	};
	main.addEventListener( 'seeked', () => {
		seeking = false;
		shown = pending;
	} );

	// first frame at the current scroll position
	const { p, ft } = railAt( window.scrollY );
	want = clampFrame( frameAt( p, ft ) );
	seek( want );
	await once( main, 'seeked' );
	clearTimeout( timer );

	const grain = addGrain( main );

	// idle loops: loaded after the film, never needed for it to work
	const loop = makeVideo( 'film-video film-video--loop' );
	let loopsReady = false;
	let loopOn = -1;
	let loopToken = 0;
	blobUrl( files.loops )
		.then( ( url ) => {
			loop.src = url;
			main.after( loop );
			return once( loop, 'loadeddata' );
		} )
		.then( () => {
			loopsReady = true;
		} )
		.catch( () => loop.remove() );

	const setLoop = ( L ) => {
		loopOn = L;
		const token = ++loopToken;
		if ( L < 0 ) {
			loop.classList.remove( 'is-on' );
			setTimeout( () => token === loopToken && loop.pause(), 400 );
			return;
		}
		loop.currentTime = ( L * LOOP_LEN ) / FPS;
		once( loop, 'seeked' )
			.then( () => token === loopToken && loop.play() )
			.then( () => token === loopToken && loop.classList.add( 'is-on' ) )
			.catch( () => {
				// autoplay refused (battery saver): the frame simply rests
				loopsReady = false;
			} );
	};

	return {
		/** One step of the page loop (boot.js). @param {{p:number, ft:?number}} s */
		frame( { p: rp, ft: rft } ) {
			const now = performance.now();
			const f = clampFrame( frameAt( rp, rft ) );
			if ( f !== want ) {
				want = f;
				moved = now;
			}
			if ( ! seeking && want !== shown ) {
				seek( want );
			}
			const L = loopsReady && now - moved > REST && want === shown ? loopAt( rp, rft ) : -1;
			if ( L !== loopOn ) {
				setLoop( L );
			}
			// wrap inside the loop's own stretch of the file
			if ( loopOn >= 0 && loop.currentTime >= ( ( loopOn + 1 ) * LOOP_LEN - 1 ) / FPS ) {
				loop.currentTime = ( loopOn * LOOP_LEN ) / FPS;
			}
		},
		resize() {},
		dispose() {
			main.remove();
			loop.remove();
			grain.remove();
		},
	};
}

function clampFrame( f ) {
	return Math.max( 0, Math.min( FRAMES - 1, Math.round( f ) ) );
}
