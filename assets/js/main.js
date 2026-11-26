/**
 * Front-end entry (script module). Each part is small, has no dependencies and does nothing when its markup is absent.
 * Without JS the page is complete and static (DESIGN.md → Motion).
 */
import { initScenes } from './scenes.js';
import { initNav } from './nav.js';
import { initHotspots } from './hotspots.js';
import { initPower } from './power.js';
import { initTabs } from './tabs.js';
import { initFilm } from './film.js';

const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' );

initNav();
initHotspots( reduced );
initPower();
initTabs();
initFilm( reduced );
initScenes( reduced );

// The outro heading lines rise once when the chapter comes into view.
const outro = document.querySelector( '.outro' );
if ( outro && 'IntersectionObserver' in window ) {
	const io = new IntersectionObserver( ( entries ) => {
		if ( entries.some( ( e ) => e.isIntersecting ) ) {
			outro.classList.add( 'is-in' );
			io.disconnect();
		}
	}, { threshold: 0.35 } );
	io.observe( outro );
}
