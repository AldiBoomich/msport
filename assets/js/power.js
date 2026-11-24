/**
 * The signature: the sound of the V10 (DESIGN.md). The button on the engine photo plays and pauses the recording;
 * while it plays the chapter gets .is-playing (the photo lights up) and a ring around the button runs with the
 * recording (--t, 0 → 1). The end of the recording or leaving the tab stops it. Without JS the native player is shown.
 */
export function initPower() {
	const box = document.querySelector( '[data-engine]' );
	const btn = box?.querySelector( '[data-sound-btn]' );
	const audio = document.getElementById( 'm6-sound' );
	if ( ! box || ! btn || ! audio ) {
		return;
	}
	let raf = 0;
	const setT = ( t ) => btn.style.setProperty( '--t', t.toFixed( 4 ) );
	const tick = () => {
		const d = audio.duration;
		setT( d > 0 ? Math.min( 1, audio.currentTime / d ) : 0 );
		raf = audio.paused ? 0 : requestAnimationFrame( tick );
	};
	const setOn = ( on ) => {
		btn.setAttribute( 'aria-pressed', String( on ) );
		box.classList.toggle( 'is-playing', on );
	};

	btn.addEventListener( 'click', () => {
		if ( audio.paused ) {
			audio.play().catch( () => setOn( false ) );
		} else {
			audio.pause();
		}
	} );
	audio.addEventListener( 'play', () => {
		setOn( true );
		if ( ! raf ) {
			raf = requestAnimationFrame( tick );
		}
	} );
	audio.addEventListener( 'pause', () => setOn( false ) );
	audio.addEventListener( 'ended', () => {
		setOn( false );
		audio.currentTime = 0;
		setT( 0 );
	} );
	document.addEventListener( 'visibilitychange', () => document.hidden && audio.pause() );
}
