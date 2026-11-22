/**
 * HTML overlays that play with the film (DESIGN.md → Chapters 3 and 8), driven by the same rail state as
 * the camera, so they match the picture whether it is the live scene, the video or the pinned stills.
 *
 * - V10: the tachometer needle and readout follow the rev curve (tools/3d/chapter-timeline.js, rescaled
 *   to the idle / redline set in the admin); the red zone lights up once the needle is in it, flashes once
 *   when it hits the limiter, and the figures count up to their value as the needle passes their rpm.
 * - SMG III: the list of seven gears becomes a readout (current gear, a strip 1–7, that gear's line).
 *   The list stays in the page for screen readers; the readout is decoration (aria-hidden).
 *
 * Without this script (reduced motion, effects off, no JS) the static markup is the final state: needle
 * at the redline, final figures, all seven gears as a list.
 */
import { rpmRev, rpmPeak, gearAt, IDLE, REDLINE, LIMITER_AT } from '../../tools/3d/chapter-timeline.js';

const REV = 2; // rail positions (boot.js → RAIL)
const SMG = 7;

/** ft of a chapter's hold for any rail state: before the hold 0, after it 1. */
const holdFt = ( { p, ft }, rail ) => {
	if ( ft !== null && Math.round( p ) === rail ) {
		return ft;
	}
	return p < rail ? 0 : 1;
};

export function createOverlays() {
	const parts = [ rev(), smg() ].filter( Boolean );
	return {
		/** @param {{p:number, ft:?number}} state */
		update( state ) {
			parts.forEach( ( part ) => part( state ) );
		},
	};
}

// ---------------------------------------------------------------- V10
function rev() {
	const svg = document.querySelector( '.chapter--rev .tacho' );
	if ( ! svg ) {
		return null;
	}
	const idle = +svg.dataset.idle || IDLE;
	const redline = +svg.dataset.redline || REDLINE;
	const redzone = +svg.dataset.redzone || redline;
	const max = +svg.dataset.max || Math.ceil( redline / 1000 ) * 1000;
	const scale = ( rpm ) => idle + ( ( rpm - IDLE ) / ( REDLINE - IDLE ) ) * ( redline - idle );
	const needle = svg.querySelector( '.tacho__needle' );
	const readout = svg.querySelector( '.tacho__readout' );

	// figures: the number counts in a box as wide as the final one (no layout shift), screen readers get
	// the final figure
	const counters = [ ...document.querySelectorAll( '.chapter--rev .stat[data-at-rpm]' ) ].map( ( stat ) => {
		const value = stat.querySelector( '.stat__value' );
		const text = value?.firstChild;
		const final = parseFloat( value?.dataset.value );
		if ( ! text || text.nodeType !== Node.TEXT_NODE || ! Number.isFinite( final ) ) {
			return null;
		}
		const decimals = ( String( value.dataset.value ).split( '.' )[ 1 ] || '' ).replace( /0+$/, '' ).length;
		const box = document.createElement( 'span' );
		box.className = 'stat__count';
		box.setAttribute( 'aria-hidden', 'true' );
		const ghost = document.createElement( 'span' );
		ghost.className = 'stat__ghost';
		ghost.textContent = text.textContent;
		const live = document.createElement( 'span' );
		live.className = 'stat__live';
		live.textContent = text.textContent;
		box.append( ghost, live );
		const sr = document.createElement( 'span' );
		sr.className = 'screen-reader-text';
		sr.textContent = text.textContent;
		text.replaceWith( box, sr );
		return { live, final, at: +stat.dataset.atRpm || redline, decimals, shown: '' };
	} ).filter( Boolean );
	const fmt = ( n, d ) => n.toLocaleString( 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d } );
	// phones and tablets: the dial sits below the text, out of view while the figures would count, so the
	// figures show their final values and only the dial plays (same breakpoint as main.css)
	const stacked = window.matchMedia( '(max-width: 63.99em)' );

	svg.classList.add( 'is-driven' );
	let last = { rpm: -1, red: null, limit: null, ft: null };
	let cutTimer = 0;
	return ( state ) => {
		const t = holdFt( state, REV );
		const rpm = scale( rpmRev( t ) );
		const shown = Math.round( rpm / 10 ) * 10;
		if ( shown !== last.rpm ) {
			needle.setAttribute( 'transform', `rotate(${ ( -135 + ( 270 * rpm ) / max ).toFixed( 2 ) } 200 200)` );
			readout.textContent = fmt( shown, 0 );
			last.rpm = shown;
		}
		const red = rpm >= redzone - 1;
		if ( red !== last.red ) {
			svg.classList.toggle( 'is-red', red );
			last.red = red;
		}
		const limit = t >= LIMITER_AT && t < 0.88;
		if ( limit !== last.limit ) {
			svg.classList.toggle( 'is-limit', limit );
			last.limit = limit;
		}
		// the cut: once, only when the scroll plays the hold forwards into the limiter
		if ( last.ft !== null && state.ft !== null && last.ft < LIMITER_AT && t >= LIMITER_AT && Math.round( state.p ) === REV ) {
			svg.classList.remove( 'is-cut' );
			void svg.getBoundingClientRect(); // restart the animation
			svg.classList.add( 'is-cut' );
			clearTimeout( cutTimer );
			cutTimer = setTimeout( () => svg.classList.remove( 'is-cut' ), 600 );
		}
		last.ft = Math.round( state.p ) === REV ? state.ft : null;

		const peak = Math.round( scale( rpmPeak( t ) ) / 10 ) * 10; // same steps as the readout
		counters.forEach( ( c ) => {
			const s = fmt( c.final * ( stacked.matches ? 1 : Math.min( 1, peak / c.at ) ), c.decimals );
			if ( s !== c.shown ) {
				c.live.textContent = s;
				c.shown = s;
			}
		} );
	};
}

// ---------------------------------------------------------------- SMG III
function smg() {
	const list = document.querySelector( '.chapter--smg .gears' );
	const items = list ? [ ...list.querySelectorAll( '.gear' ) ] : [];
	if ( ! items.length ) {
		return null;
	}
	const gears = items.map( ( li ) => ( {
		n: li.querySelector( '.gear__number' )?.textContent.trim() || '',
		line: li.querySelector( '.gear__line' )?.textContent.trim() || '',
	} ) );

	const box = document.createElement( 'div' );
	box.className = 'gearbox';
	box.setAttribute( 'aria-hidden', 'true' );
	const now = document.createElement( 'span' );
	now.className = 'gearbox__now';
	const strip = document.createElement( 'span' );
	strip.className = 'gearbox__strip';
	const lines = document.createElement( 'span' );
	lines.className = 'gearbox__lines';
	const cells = gears.map( ( g ) => {
		const cell = document.createElement( 'span' );
		cell.className = 'gearbox__cell';
		cell.textContent = g.n;
		strip.append( cell );
		const line = document.createElement( 'span' );
		line.className = 'gearbox__line';
		line.textContent = g.line;
		lines.append( line );
		return { cell, line };
	} );
	// the big number is as wide as the widest gear name, so it never shifts the strip
	const ghost = gears.reduce( ( a, g ) => ( g.n.length > a.length ? g.n : a ), '' );
	now.innerHTML = '<span class="gearbox__ghost"></span><span class="gearbox__digit"></span>';
	now.firstChild.textContent = ghost;
	const digit = now.lastChild;
	box.append( now, strip, lines );
	list.after( box );
	list.classList.add( 'is-readout' );

	let shown = -1;
	return ( state ) => {
		const g = Math.min( gears.length, gearAt( holdFt( state, SMG ) ) ) - 1;
		if ( g === shown ) {
			return;
		}
		digit.textContent = gears[ g ].n;
		cells.forEach( ( c, k ) => {
			c.cell.classList.toggle( 'is-past', k < g );
			c.cell.classList.toggle( 'is-now', k === g );
			c.line.classList.toggle( 'is-now', k === g );
		} );
		shown = g;
	};
}
