/**
 * Trial (?film=frames, boot.js): the Cycles film as a frame sequence on a canvas, the way product pages show
 * pre-rendered films. Each scroll position draws one WebP still (tools/3d/frames-pack.mjs, in
 * uploads/msport-film/), so the picture is a sharp Cycles frame: no video compression, no seeking.
 *
 * - Every frame is fetched as a blob, a few at a time, nearest to the scroll position first; the preloader
 *   waits for the stretch around the starting position (its hold and the leg after it).
 * - Only a few frames are decoded at a time (ImageBitmap, off the main thread); while the wanted one decodes,
 *   the nearest decoded frame stays up.
 * - Resting inside a chapter plays its idle loop (video-timeline.js → LOOPS) over the frame, as the video did.
 * - A light animated grain lies over it (grain.js).
 */
import { FRAMES, frameAt, loopAt, LOOPS, LOOP_LEN } from '../../tools/3d/video-timeline.js';
import { addGrain } from './grain.js';

const FPS = 30;
const REST = 300; // ms without scroll before an idle loop starts
const FADE_IN = 400; // ms, idle loop over the frame
const FADE_OUT = 250;
const KEEP = 24; // decoded frames kept (≈ 8 MB each at 1080p)
const FETCHES = 8; // parallel downloads
const DECODES = 4; // parallel decodes
const AHEAD = 4; // frames decoded ahead in the scroll's direction
const LOAD_LIMIT = 10000;
const LOOP0 = FRAMES; // key of frame k of loop L: LOOP0 + L * LOOP_LEN + k
const TOTAL = LOOP0 + LOOPS.length * LOOP_LEN;

const pad = ( n, w ) => String( n ).padStart( w, '0' );
const clampFrame = ( f ) => Math.max( 0, Math.min( FRAMES - 1, Math.round( f ) ) );

/**
 * @param {object}    o
 * @param {Function}  o.railAt     scroll position → { p, ft }
 * @param {?Function} o.onProgress 0…1, the preloader
 * @param {?Function} o.onLate     the load passed LOAD_LIMIT
 * @return {Promise<object|null>} the player once its first frame is drawn, or null
 */
export async function goFrames( { railAt, onProgress = null, onLate = null } ) {
	const dataEl = document.getElementById( 'msport-film-data' );
	const data = dataEl ? JSON.parse( dataEl.textContent ) : null;
	if ( ! data?.frames ) {
		return null;
	}
	const base = window.innerHeight > window.innerWidth ? data.frames.port : data.frames.land;
	const urlOf = ( key ) => ( key < LOOP0
		? `${ base }film/f${ pad( key, 4 ) }.webp`
		: `${ base }loops/l${ pad( Math.floor( ( key - LOOP0 ) / LOOP_LEN ), 2 ) }_${ pad( ( key - LOOP0 ) % LOOP_LEN, 2 ) }.webp` );

	let disposed = false;
	const start = railAt( window.scrollY );
	let want = clampFrame( frameAt( start.p, start.ft ) );
	let lastWant = want;
	let rail = Math.round( start.p );

	// ---- downloads: blobs[key], state 0 not asked, 1 in flight, 2 have, 3 failed
	const blobs = new Array( TOTAL ).fill( null );
	const state = new Uint8Array( TOTAL );
	const loopOrder = () => LOOPS.map( ( l, L ) => L ).sort( ( a, b ) => Math.abs( LOOPS[ a ].rail - rail ) - Math.abs( LOOPS[ b ].rail - rail ) );
	const pick = () => {
		// film frames nearest to the scroll position first (ahead before behind), then the loops nearest to it
		for ( let d = 0; d < FRAMES; d++ ) {
			for ( const k of [ want + d, want - d ] ) {
				if ( k >= 0 && k < FRAMES && ! state[ k ] ) {
					return k;
				}
			}
		}
		for ( const L of loopOrder() ) {
			for ( let k = 0; k < LOOP_LEN; k++ ) {
				const key = LOOP0 + L * LOOP_LEN + k;
				if ( ! state[ key ] ) {
					return key;
				}
			}
		}
		return -1;
	};

	// the preloader waits for this stretch: the starting hold and the leg after it
	const need = [];
	for ( let k = Math.max( 0, want - 45 ); k <= Math.min( FRAMES - 1, want + 225 ); k++ ) {
		need.push( k );
	}
	let needDone = 0;
	let failed = 0;
	let resolveNeed;
	const needReady = new Promise( ( resolve ) => ( resolveNeed = resolve ) );
	const needSet = new Set( need );

	const fetchOne = async () => {
		while ( ! disposed ) {
			const key = pick();
			if ( key < 0 ) {
				return;
			}
			state[ key ] = 1;
			try {
				const res = await fetch( urlOf( key ) );
				if ( ! res.ok ) {
					throw new Error( res.status );
				}
				blobs[ key ] = await res.blob();
				state[ key ] = 2;
			} catch {
				state[ key ] = 3;
				failed++;
			}
			if ( needSet.has( key ) ) {
				needDone++;
				onProgress?.( needDone / need.length );
				if ( needDone === need.length ) {
					resolveNeed();
				}
			}
		}
	};
	for ( let i = 0; i < FETCHES; i++ ) {
		fetchOne();
	}

	const timer = setTimeout( () => onLate?.(), LOAD_LIMIT );
	await needReady;
	if ( failed > need.length / 2 || state[ want ] !== 2 ) {
		disposed = true;
		clearTimeout( timer );
		return null;
	}

	// ---- decoding: a few ImageBitmaps around the scroll position
	const bitmaps = new Map();
	const decoding = new Set();
	let loopOn = -1; // the loop playing (or fading out)
	let loopK = 0;
	const score = ( key ) => {
		if ( key < LOOP0 ) {
			return Math.abs( key - want );
		}
		const L = Math.floor( ( key - LOOP0 ) / LOOP_LEN );
		const k = ( key - LOOP0 ) % LOOP_LEN;
		return L === loopOn ? ( k - loopK + LOOP_LEN ) % LOOP_LEN : 1e9;
	};
	let shownFilm = -1;
	let shownLoop = -1;
	const trim = () => {
		if ( bitmaps.size <= KEEP ) {
			return;
		}
		const keys = [ ...bitmaps.keys() ].filter( ( k ) => k !== shownFilm && k !== shownLoop ).sort( ( a, b ) => score( b ) - score( a ) );
		for ( const k of keys.slice( 0, bitmaps.size - KEEP ) ) {
			bitmaps.get( k ).close();
			bitmaps.delete( k );
		}
	};
	const decode = ( key ) => {
		if ( bitmaps.has( key ) || decoding.has( key ) || state[ key ] !== 2 || decoding.size >= DECODES ) {
			return;
		}
		decoding.add( key );
		createImageBitmap( blobs[ key ] )
			.then( ( b ) => {
				if ( disposed ) {
					b.close();
					return;
				}
				bitmaps.set( key, b );
				trim();
			} )
			.catch( () => {} )
			.finally( () => decoding.delete( key ) );
	};

	const first = await createImageBitmap( blobs[ want ] );
	bitmaps.set( want, first );
	clearTimeout( timer );

	// ---- canvas: the backing store is the part of the frame that covers the screen, drawn 1:1
	const canvas = document.createElement( 'canvas' );
	canvas.className = 'film-canvas film-canvas--frames';
	canvas.setAttribute( 'aria-hidden', 'true' );
	const ctx = canvas.getContext( '2d', { alpha: false } );
	const srcW = first.width;
	const srcH = first.height;
	let crop = null;
	let dirty = true;
	const fit = () => {
		const s = Math.max( window.innerWidth / srcW, window.innerHeight / srcH );
		const sw = Math.min( srcW, window.innerWidth / s );
		const sh = Math.min( srcH, window.innerHeight / s );
		crop = { sx: ( srcW - sw ) / 2, sy: ( srcH - sh ) / 2, sw, sh };
		canvas.width = Math.round( sw );
		canvas.height = Math.round( sh );
		dirty = true;
	};
	fit();
	document.body.prepend( canvas );
	const grain = addGrain( canvas );

	let loopAlpha = 0;
	let loopT0 = 0;
	let moved = performance.now();
	let last = performance.now();
	const loopReady = ( L ) => {
		for ( let k = 0; k < LOOP_LEN; k++ ) {
			if ( state[ LOOP0 + L * LOOP_LEN + k ] !== 2 ) {
				return false;
			}
		}
		return true;
	};
	const nearestFilm = () => {
		let best = shownFilm;
		let bd = best < 0 ? Infinity : Math.abs( best - want );
		for ( const k of bitmaps.keys() ) {
			if ( k < LOOP0 && Math.abs( k - want ) < bd ) {
				best = k;
				bd = Math.abs( k - want );
			}
		}
		return best;
	};
	const draw = () => {
		const { sx, sy, sw, sh } = crop;
		ctx.globalAlpha = 1;
		ctx.drawImage( bitmaps.get( shownFilm ), sx, sy, sw, sh, 0, 0, canvas.width, canvas.height );
		if ( loopAlpha > 0 && bitmaps.has( shownLoop ) ) {
			ctx.globalAlpha = loopAlpha;
			ctx.drawImage( bitmaps.get( shownLoop ), sx, sy, sw, sh, 0, 0, canvas.width, canvas.height );
		}
	};

	const player = {
		/** One step of the page loop (boot.js). @param {{p:number, ft:?number, draw?:boolean}} s */
		frame( { p, ft, draw: visible = true } ) {
			const now = performance.now();
			const dt = Math.min( 100, now - last );
			last = now;
			const f = clampFrame( frameAt( p, ft ) );
			rail = Math.round( p );
			if ( f !== want ) {
				lastWant = want;
				want = f;
				moved = now;
			}

			// the wanted frame and a few ahead in the scroll's direction
			decode( want );
			const dir = want >= lastWant ? 1 : -1;
			for ( let i = 1; i <= AHEAD; i++ ) {
				decode( clampFrame( want + dir * i ) );
			}
			const film = bitmaps.has( want ) ? want : nearestFilm();
			if ( film !== shownFilm ) {
				shownFilm = film;
				dirty = true;
			}

			// idle loop: starts once the scroll rests on a frame inside a loop's range
			const L = now - moved > REST && shownFilm === want ? loopAt( p, ft ) : -1;
			if ( L >= 0 && L !== loopOn && loopAlpha === 0 && loopReady( L ) ) {
				loopOn = L;
				loopT0 = now;
			}
			const on = L >= 0 && L === loopOn;
			if ( loopOn >= 0 ) {
				loopK = Math.floor( ( ( now - loopT0 ) / 1000 ) * FPS ) % LOOP_LEN;
				for ( let i = 0; i < 3; i++ ) {
					decode( LOOP0 + loopOn * LOOP_LEN + ( ( loopK + i ) % LOOP_LEN ) );
				}
				const key = LOOP0 + loopOn * LOOP_LEN + loopK;
				if ( bitmaps.has( key ) && key !== shownLoop ) {
					shownLoop = key;
					dirty = true;
				}
				const a = on && bitmaps.has( shownLoop )
					? Math.min( 1, loopAlpha + dt / FADE_IN )
					: Math.max( 0, loopAlpha - dt / FADE_OUT );
				if ( a !== loopAlpha ) {
					loopAlpha = a;
					dirty = true;
				}
				if ( loopAlpha === 0 && ! on ) {
					loopOn = -1;
					shownLoop = -1;
				}
			}

			if ( dirty && visible ) {
				draw();
				dirty = false;
			}
		},
		resize() {
			fit();
		},
		dispose() {
			disposed = true;
			bitmaps.forEach( ( b ) => b.close() );
			bitmaps.clear();
			canvas.remove();
			grain.remove();
		},
	};
	shownFilm = want;
	draw();
	dirty = false;
	return player;
}
