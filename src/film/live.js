/**
 * The live Three.js scene (a separate chunk, loaded by boot.js after the hero still has painted).
 *
 * Returns the film (tools/3d/film-scene.js) once its first frame is drawn, or null when this device
 * should stay on the stills: no WebGL2 / software rendering, no settings, or the scene took longer than
 * 6 s to load (DESIGN.md → 3D / WebGL → Fallback).
 */
import { createFilm } from '../../tools/3d/film-scene.js';

const LOAD_LIMIT = 6000;

export async function goLive( { railAt } ) {
	const probe = document.createElement( 'canvas' ).getContext( 'webgl2', { failIfMajorPerformanceCaveat: true } );
	if ( ! probe ) {
		return null;
	}
	probe.getExtension( 'WEBGL_lose_context' )?.loseContext();

	const dataEl = document.getElementById( 'msport-film-data' );
	const data = dataEl ? JSON.parse( dataEl.textContent ) : null;
	if ( ! data ) {
		return null;
	}

	// phones and small tablets: lighter panorama, lower resolution
	const mobile = window.matchMedia( '(pointer: coarse)' ).matches && Math.min( screen.width, screen.height ) < 820;
	const dpr = Math.min( window.devicePixelRatio || 1, mobile ? 1.25 : 1.5 );

	const canvas = document.createElement( 'canvas' );
	canvas.className = 'film-canvas';
	canvas.setAttribute( 'aria-hidden', 'true' );
	document.body.prepend( canvas );

	const loading = createFilm( {
		canvas,
		width: window.innerWidth,
		height: window.innerHeight,
		dpr,
		adaptive: true,
		look: data.look || {},
		urls: {
			model: mobile ? data.modelMobile : data.model,
			sky: mobile ? data.skyMobile : data.sky,
			shadow: data.shadow,
			asphalt: data.asphalt,
		},
	} );
	let timer = 0;
	const late = new Promise( ( resolve ) => {
		timer = setTimeout( () => resolve( null ), LOAD_LIMIT );
	} );
	performance.mark( 'msport-film-load' );
	const film = await Promise.race( [ loading, late ] );
	performance.mark( 'msport-film-ready' );
	clearTimeout( timer );
	if ( ! film ) {
		loading.then( ( f ) => f.dispose() ).catch( () => {} ).finally( () => canvas.remove() );
		return null;
	}

	// first frame at the current scroll position, before the stills fade
	const { p, ft } = railAt( window.scrollY );
	film.frame( { p, ft, dt: 1 / 60 } );
	alignStills( film );
	return film;
}

/**
 * A still is a 16:9 render scaled to cover the screen; the live frame keeps the same vertical field of
 * view but shifts the car by a fraction of the screen width. On screens narrower than 16:9 that differs by
 * a few dozen pixels: move each landscape still so the cross-fade does not show a double image.
 *
 * @param {object} film
 */
function alignStills( film ) {
	const W = window.innerWidth;
	const H = window.innerHeight;
	if ( H > W || W / H >= 16 / 9 ) {
		return;
	}
	const RAIL = { hero: 0, front: 1, rev: 2, wheels: 3, gills: 4, roof: 5, sound: 6, smg: 7, spec: 8, outro: 9 };
	const keys = film.keys();
	document.querySelectorAll( '[data-chapter] .chapter__still' ).forEach( ( img ) => {
		const key = keys[ RAIL[ img.closest( '[data-chapter]' ).dataset.chapter ] ];
		if ( key?.shift ) {
			img.style.objectPosition = `calc(50% + ${ ( key.shift[ 0 ] * ( W / 2 - ( 8 * H ) / 9 ) ).toFixed( 1 ) }px) 50%`;
		}
	} );
}
