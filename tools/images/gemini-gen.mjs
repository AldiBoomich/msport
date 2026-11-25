// Generate the round-2 studio shots with the Gemini image API, one car for every screen.
// Reads the prompts from press-m6/gemini/PROMPTS-ROUND2.md ("## r2-xx-name.png — …, 16:9" + the prompt paragraph),
// attaches the two shots already on the site as the reference for the car and the studio (plus the M635CSi press photo
// for the heritage shot) and saves every result next to the prompts file.
//
// usage:  node gemini-gen.mjs [--only r2-01,r2-03] [--variants 2] [--dry]
// needs:  the environment variable GEMINI_API_KEY (Google AI Studio key); optional GEMINI_IMAGE_MODEL
//         (default gemini-2.5-flash-image). The key is read from the environment only, never written anywhere.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'C:/Users/aaldi/Local Sites/msport/press-m6/gemini';
const REFS = [ '01-hero-rear-night.jpg', '03-rear34-light.jpg' ].map( ( f ) => path.join( DIR, f ) );
const HERITAGE_REF = 'C:/Users/aaldi/Local Sites/msport/press-m6/final/heritage-m635csi.webp';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

const args = process.argv.slice( 2 );
const dry = args.includes( '--dry' );
const only = ( args[ args.indexOf( '--only' ) + 1 ] || '' ).split( ',' ).filter( ( s ) => args.includes( '--only' ) && s );
const variants = Number( args.includes( '--variants' ) ? args[ args.indexOf( '--variants' ) + 1 ] : 1 ) || 1;

// "## r2-01-profile.png — Profile (dark), 21:9 — replaces …" + the next paragraph that is not an instruction line.
const md = fs.readFileSync( path.join( DIR, 'PROMPTS-ROUND2.md' ), 'utf8' );
const jobs = [];
for ( const block of md.split( /\n(?=## )/ ) ) {
	const head = block.match( /^## (r2-[\w-]+)\.png — ([^\n]*)/ );
	if ( ! head ) {
		continue;
	}
	const ratio = ( head[ 2 ].match( /\b(21:9|16:9|3:2|4:3|4:5|1:1)\b/ ) || [ , '16:9' ] )[ 1 ];
	const prompt = block.split( '\n' ).slice( 1 ).filter( ( l ) => /^Photorealistic/.test( l ) ).join( ' ' );
	if ( prompt && ( ! only.length || only.some( ( o ) => head[ 1 ].startsWith( o ) ) ) ) {
		jobs.push( { name: head[ 1 ], ratio, prompt, heritage: head[ 1 ].includes( 'heritage' ) } );
	}
}

const mime = ( f ) => ( f.endsWith( '.webp' ) ? 'image/webp' : f.endsWith( '.png' ) ? 'image/png' : 'image/jpeg' );
const part = ( f ) => ( { inline_data: { mime_type: mime( f ), data: fs.readFileSync( f ).toString( 'base64' ) } } );

console.log( `${ jobs.length } shots, model ${ MODEL }${ dry ? ' (dry run)' : '' }` );
if ( dry ) {
	jobs.forEach( ( j ) => console.log( `  ${ j.name } ${ j.ratio } ${ j.prompt.slice( 0, 90 ) }…` ) );
	process.exit( 0 );
}
const key = process.env.GEMINI_API_KEY;
if ( ! key ) {
	console.error( 'GEMINI_API_KEY is not set.' );
	process.exit( 1 );
}

for ( const j of jobs ) {
	for ( let v = 1; v <= variants; v++ ) {
		const refs = j.heritage ? [ ...REFS, HERITAGE_REF ] : REFS;
		const lead = j.heritage
			? 'The first two photos show the car (paint, wheels, details). The third photo shows the camera angle and the road to copy. '
			: 'The attached photos show the exact car (paint, wheels, details) and the two studios. Same car, same paint, same wheels. ';
		const body = {
			contents: [ { parts: [ ...refs.map( part ), { text: lead + j.prompt } ] } ],
			generationConfig: { responseModalities: [ 'IMAGE' ], imageConfig: { aspectRatio: j.ratio } },
		};
		const res = await fetch( `https://generativelanguage.googleapis.com/v1beta/models/${ MODEL }:generateContent`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
			body: JSON.stringify( body ),
		} );
		const json = await res.json();
		if ( ! res.ok ) {
			console.error( `${ j.name }: HTTP ${ res.status } ${ json.error?.message || '' }` );
			continue;
		}
		const img = json.candidates?.[ 0 ]?.content?.parts?.find( ( p ) => p.inlineData || p.inline_data );
		if ( ! img ) {
			console.error( `${ j.name }: no image (${ json.candidates?.[ 0 ]?.finishReason || 'no candidate' })` );
			continue;
		}
		const data = ( img.inlineData || img.inline_data ).data;
		const out = path.join( DIR, `${ j.name }${ variants > 1 ? '-v' + v : '' }.png` );
		fs.writeFileSync( out, Buffer.from( data, 'base64' ) );
		console.log( `${ j.name }: saved ${ path.basename( out ) }` );
	}
}
