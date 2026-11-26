/**
 * The panoramic driving film (Ferrari-like). A muted loop that loads and plays only while at least a third of it is on
 * screen and pauses when it leaves or the tab is hidden. The button on it pauses and plays; a pause by the visitor is
 * kept until they press play again. Reduced motion: it never starts by itself. Without JS the native player is shown.
 */
export function initFilm( reduced ) {
	const box = document.querySelector( '[data-film]' );
	const video = box?.querySelector( 'video' );
	const btn = box?.querySelector( '[data-film-toggle]' );
	if ( ! box || ! video || ! btn ) {
		return;
	}
	video.removeAttribute( 'controls' );
	let held = false; // paused by the visitor
	let seen = false;

	const sync = () => {
		const on = ! video.paused;
		box.classList.toggle( 'is-playing', on );
		btn.setAttribute( 'aria-label', btn.dataset[ on ? 'labelPause' : 'labelPlay' ] );
	};
	const play = () => video.play().catch( sync );

	btn.addEventListener( 'click', () => {
		if ( video.paused ) {
			held = false;
			play();
		} else {
			held = true;
			video.pause();
		}
	} );
	video.addEventListener( 'play', sync );
	video.addEventListener( 'pause', sync );

	if ( 'IntersectionObserver' in window ) {
		new IntersectionObserver( ( entries ) => {
			seen = entries.some( ( e ) => e.isIntersecting );
			if ( seen && ! held && ! reduced.matches ) {
				play();
			} else if ( ! seen ) {
				video.pause();
			}
		}, { threshold: 0.35 } ).observe( video );
	}
	document.addEventListener( 'visibilitychange', () => {
		if ( document.hidden ) {
			video.pause();
		} else if ( seen && ! held && ! reduced.matches ) {
			play();
		}
	} );
	sync();
}
