/**
 * The signature: the POWER key (DESIGN.md). The chapter starts in P400 (400 PS, needle at idle). Pressing POWER plays
 * the V10 recording, lights the LED, rolls the output 400 → 507 and runs the needle along the rev curve of the
 * recording ([[seconds, rpm], …] from M6 Settings; a built-in blip-to-redline profile otherwise). Pressing again stops
 * the sound and returns to P400. Reduced motion: no roll and no sweep — the number and the needle jump; sound still plays.
 */
const FALLBACK_CURVE = [
	[ 0, 800 ], [ 0.5, 1100 ], [ 1.4, 5200 ], [ 2.2, 8250 ], [ 2.6, 8100 ], [ 3.2, 3000 ], [ 4.2, 6500 ],
	[ 5, 8250 ], [ 5.6, 7600 ], [ 7, 2400 ], [ 8.5, 7800 ], [ 9.3, 8250 ], [ 10.2, 4200 ], [ 12, 1400 ], [ 13.5, 900 ],
];

export function initPower( reduced ) {
	const box = document.querySelector( '[data-power]' );
	const key = box?.querySelector( '[data-power-key]' );
	const tacho = box?.querySelector( '[data-tacho]' );
	if ( ! box || ! key || ! tacho ) {
		return;
	}
	const audio = document.getElementById( 'm6-sound' );
	const valueEl = box.querySelector( '[data-power-value]' );
	const modeEl = box.querySelector( '[data-power-mode]' );
	const readout = tacho.querySelector( '[data-tacho-readout]' );
	const from = Number( box.dataset.from ) || 400;
	const to = Number( box.dataset.to ) || 507;
	const idle = Number( tacho.dataset.idle ) || 800;
	const max = Number( tacho.dataset.max ) || 9000;
	const section = box.closest( '.power' ) || box;
	const fmt = new Intl.NumberFormat( document.documentElement.lang || 'en' );
	let curve = FALLBACK_CURVE;
	try {
		const c = JSON.parse( box.dataset.curve || 'null' );
		if ( Array.isArray( c ) && c.length > 1 ) {
			curve = c;
		}
	} catch ( e ) {
		// Keep the built-in profile.
	}

	const angle = ( rpm ) => -135 + ( 270 * Math.min( max, Math.max( 0, rpm ) ) ) / max;
	let shownRpm = idle;
	const setRpm = ( rpm ) => {
		shownRpm = rpm;
		tacho.style.setProperty( '--deg', angle( rpm ).toFixed( 2 ) + 'deg' );
		if ( readout ) {
			readout.textContent = fmt.format( Math.round( rpm / 50 ) * 50 );
		}
	};
	const rpmAt = ( t ) => {
		if ( t <= curve[ 0 ][ 0 ] ) {
			return curve[ 0 ][ 1 ];
		}
		for ( let i = 1; i < curve.length; i++ ) {
			const [ t1, r1 ] = curve[ i ];
			if ( t <= t1 ) {
				const [ t0, r0 ] = curve[ i - 1 ];
				return r0 + ( ( r1 - r0 ) * ( t - t0 ) ) / ( t1 - t0 || 1 );
			}
		}
		return curve[ curve.length - 1 ][ 1 ];
	};

	// Start in P400.
	valueEl.textContent = fmt.format( from );
	modeEl.textContent = box.dataset.modeOff;
	setRpm( idle );

	let on = false;
	let raf = 0;
	const t0 = { audio: 0 };

	const roll = ( a, b, ms ) => {
		if ( reduced.matches ) {
			valueEl.textContent = fmt.format( b );
			return;
		}
		const start = performance.now();
		const step = ( now ) => {
			const k = Math.min( 1, ( now - start ) / ms );
			const e = 1 - Math.pow( 1 - k, 3 );
			valueEl.textContent = fmt.format( Math.round( a + ( b - a ) * e ) );
			if ( k < 1 ) {
				requestAnimationFrame( step );
			}
		};
		requestAnimationFrame( step );
	};

	// Needle: follows the recording time; eases toward the target so it never jumps (unless reduced motion).
	const loop = () => {
		const t = audio && ! audio.paused ? audio.currentTime : t0.audio;
		const target = on ? rpmAt( t ) : idle;
		const next = reduced.matches ? target : shownRpm + ( target - shownRpm ) * 0.35;
		setRpm( next );
		if ( on || Math.abs( next - idle ) > 5 ) {
			raf = requestAnimationFrame( loop );
		} else {
			setRpm( idle );
			raf = 0;
		}
	};
	const run = () => {
		if ( ! raf ) {
			raf = requestAnimationFrame( loop );
		}
	};

	const setOn = ( v ) => {
		if ( v === on ) {
			return;
		}
		on = v;
		key.setAttribute( 'aria-pressed', String( on ) );
		section.classList.toggle( 'is-power-on', on );
		modeEl.textContent = on ? box.dataset.modeOn : box.dataset.modeOff;
		roll( on ? from : to, on ? to : from, on ? 900 : 500 );
		if ( on && audio ) {
			audio.currentTime = 0;
			audio.play().catch( () => {} );
		} else if ( audio ) {
			audio.pause();
		}
		run();
	};

	key.addEventListener( 'click', () => setOn( ! on ) );
	audio?.addEventListener( 'ended', () => setOn( false ) );
	document.addEventListener( 'visibilitychange', () => document.hidden && setOn( false ) );
}
