/**
 * The V10 sound: every [data-sound-toggle] button plays / pauses the one <audio id="m6-sound">.
 * Never autoplays; the file is fetched on the first press (preload="none").
 * Buttons: aria-pressed + visible label switch ("Play the V10" / "Pause"); progress lines follow the playback.
 */
( () => {
	const audio = document.getElementById( 'm6-sound' );
	const buttons = document.querySelectorAll( '[data-sound-toggle]' );
	if ( ! audio || ! buttons.length ) {
		return;
	}
	const bars = document.querySelectorAll( '[data-sound-progress]' );

	const render = () => {
		const playing = ! audio.paused && ! audio.ended;
		document.documentElement.classList.toggle( 'is-sound-playing', playing );
		buttons.forEach( ( button ) => {
			button.setAttribute( 'aria-pressed', String( playing ) );
			const label = button.querySelector( '.sound__label' );
			if ( label ) {
				label.textContent = playing ? button.dataset.labelPause : button.dataset.labelPlay;
			}
		} );
	};

	const progress = () => {
		const share = audio.duration ? audio.currentTime / audio.duration : 0;
		bars.forEach( ( bar ) => {
			bar.style.transform = `scaleX(${ share })`;
		} );
	};

	buttons.forEach( ( button ) => {
		button.addEventListener( 'click', () => {
			if ( audio.paused || audio.ended ) {
				audio.play().catch( render );
			} else {
				audio.pause();
			}
		} );
	} );

	audio.addEventListener( 'play', render );
	audio.addEventListener( 'pause', render );
	audio.addEventListener( 'ended', () => {
		audio.currentTime = 0;
		render();
		progress();
	} );
	audio.addEventListener( 'timeupdate', progress );

	// Stop the sound when the tab is hidden.
	document.addEventListener( 'visibilitychange', () => {
		if ( document.hidden && ! audio.paused ) {
			audio.pause();
		}
	} );
} )();
