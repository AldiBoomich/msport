/**
 * Scroll-scrubbed scenes. Native scroll only (no scroll-jacking): for every [data-scene] section the progress of its
 * sticky stage (0 when the section top meets the viewport top, 1 when its end does) goes to the CSS variable --p, and
 * its entry (0 when the section top meets the viewport bottom, 1 when it reaches the top) goes to --in.
 * The drive collage gets --sp (-1 … 1: the section crossing the viewport) for a slight drift of its photos.
 * Full-bleed photos [data-reveal] get --rv (0 when their top meets the viewport bottom, 1 when it is near the top): the
 * frame opens from an inset rounded card to the full screen (Porsche-like).
 * One rAF per scroll frame; sections off screen are skipped. Reduced motion: nothing is written (CSS keeps it static).
 */
export function initScenes( reduced ) {
	const scenes = [ ...document.querySelectorAll( '[data-scene]' ) ];
	const collage = document.querySelector( '.collage' );
	const drift = collage ? [ ...collage.querySelectorAll( '[data-drift]' ) ] : [];
	drift.forEach( ( el ) => el.style.setProperty( '--d', el.dataset.drift ) );
	const reveals = [ ...document.querySelectorAll( '[data-reveal]' ) ];

	let queued = false;
	let vh = window.innerHeight;

	const update = () => {
		queued = false;
		if ( reduced.matches ) {
			return;
		}
		for ( const s of scenes ) {
			const r = s.getBoundingClientRect();
			if ( r.bottom < -vh || r.top > 2 * vh ) {
				continue;
			}
			const travel = Math.max( 1, r.height - vh );
			const p = Math.min( 1, Math.max( 0, -r.top / travel ) );
			const entry = Math.min( 1, Math.max( 0, 1 - r.top / vh ) );
			s.style.setProperty( '--p', p.toFixed( 4 ) );
			s.style.setProperty( '--in', entry.toFixed( 4 ) );
		}
		for ( const el of reveals ) {
			const r = el.getBoundingClientRect();
			const rv = Math.min( 1, Math.max( 0, ( vh - r.top ) / ( vh * 0.85 ) ) );
			el.style.setProperty( '--rv', rv.toFixed( 4 ) );
		}
		if ( collage ) {
			const r = collage.getBoundingClientRect();
			if ( r.bottom > 0 && r.top < vh ) {
				const sp = ( r.top + r.height / 2 - vh / 2 ) / ( vh / 2 + r.height / 2 );
				collage.style.setProperty( '--sp', Math.max( -1, Math.min( 1, sp ) ).toFixed( 4 ) );
			}
		}
	};

	const queue = () => {
		if ( ! queued ) {
			queued = true;
			requestAnimationFrame( update );
		}
	};

	window.addEventListener( 'scroll', queue, { passive: true } );
	window.addEventListener( 'resize', () => {
		vh = window.innerHeight;
		queue();
	} );
	reduced.addEventListener?.( 'change', () => {
		scenes.forEach( ( s ) => {
			s.style.removeProperty( '--p' );
			s.style.removeProperty( '--in' );
		} );
		collage?.style.removeProperty( '--sp' );
		reveals.forEach( ( el ) => el.style.removeProperty( '--rv' ) );
		queue();
	} );
	update();
}
