/**
 * The pre-rendered film (a separate chunk, loaded by boot.js): the same camera rail rendered on a strong
 * graphics card as one video (tools/3d/video.mjs), scrubbed by the scroll. Used on phones and on computers
 * whose graphics cannot hold the live scene at full quality (DESIGN.md → How the 3D film works).
 *
 * - The film is fetched whole (a blob), so any frame can be shown at once: a keyframe every 8 frames keeps
 *   a seek at ~5 ms, also on integrated graphics.
 * - When the scroll rests inside a chapter, a seamless idle loop (road, wheels, street lamps moving) fades
 *   in over the still frame and fades out when the scroll moves again (video-timeline.js → LOOPS).
 * - The film is rendered without grain (it would bloat the file); a light animated grain lies over it.
 */
import { FRAMES, frameAt, loopAt, LOOP_LEN } from '../../tools/3d/video-timeline.js';

const FPS = 30;
const REST = 300; // ms without scroll before an idle loop starts

const blobUrl = async ( url ) => URL.createObjectURL( await ( await fetch( url ) ).blob() );

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
 * @param {object}   o
 * @param {Function} o.railAt  scroll position → { p, ft }
 * @param {Element}  o.before  the element the video goes in front of in the DOM (the live canvas, if any)
 * @return {Promise<object|null>} the player once its first frame is shown, or null
 */
export async function goVideo( { railAt, before = null } ) {
	const dataEl = document.getElementById( 'msport-film-data' );
	const data = dataEl ? JSON.parse( dataEl.textContent ) : null;
	if ( ! data?.video ) {
		return null;
	}
	const files = window.innerHeight > window.innerWidth ? data.video.port : data.video.land;

	const main = makeVideo( 'film-video' );
	main.src = await blobUrl( files.film );
	document.body.insertBefore( main, before || document.body.firstChild );
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

	// grain over the video (the live scene draws its own)
	const grain = document.createElement( 'div' );
	grain.className = 'film-grain';
	grain.setAttribute( 'aria-hidden', 'true' );
	grain.style.backgroundImage = `url(${ noise() })`;
	main.after( grain );

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
		/** One step of the page loop. @param {{p:number, ft:?number}} s @param {number} now */
		update( { p: rp, ft: rft }, now ) {
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
	};
}

function clampFrame( f ) {
	return Math.max( 0, Math.min( FRAMES - 1, Math.round( f ) ) );
}

/** A small tile of film grain: light and dark specks, mostly transparent. */
function noise() {
	const c = document.createElement( 'canvas' );
	c.width = c.height = 128;
	const ctx = c.getContext( '2d' );
	const img = ctx.createImageData( 128, 128 );
	for ( let i = 0; i < img.data.length; i += 4 ) {
		const v = Math.random();
		const light = v > 0.5;
		img.data[ i ] = img.data[ i + 1 ] = img.data[ i + 2 ] = light ? 255 : 0;
		img.data[ i + 3 ] = Math.round( Math.abs( v - 0.5 ) * 2 * 9 );
	}
	ctx.putImageData( img, 0, 0 );
	return c.toDataURL( 'image/png' );
}
