// Camera keys for the 10 chapters (DESIGN.md → Motion → Chapters).
// Art direction, not content: lives in theme JS, the theme imports this file as is.
//
// World: car length 4.86 m along z, FRONT = +z, car's LEFT side = +x, ground y = 0.
// Front wheel centre ≈ (±0.76, 0.34, 1.48), rear ≈ (±0.78, 0.34, -1.31).
//
// pos / target: metres. fov: vertical degrees.
// shift: where the target sits on screen, as a fraction of the half-viewport
//   desktop: [x, y]  (+x = right). Text column is the left 5/12, so details sit right.
//   mobile:  separate key (portrait 4:5 frame, detail in the top 60%).
// lights: headlights on in this chapter.
// via: extra rail points on the way to the NEXT chapter (tools/3d/camera-path.js). Checked so the
//   camera never enters the car (0.25 m margin), never dips under the road and turns gently.

export const CHAPTERS = [
  {
    id: 'top', title: 'Hero',
    pos: [5.4, 1.15, 6.6], target: [0, 0.62, 0.25], fov: 30, shift: [0.3, -0.04],
    mobile: { pos: [4.2, 1.5, 7.6], target: [0, 0.6, 0.2], fov: 38, shift: [0, 0.32] },
  },
  {
    id: 'front', title: 'Nose and lights', lights: true,
    pos: [1.75, 0.5, 4.1], target: [0.35, 0.66, 2.1], fov: 28, shift: [0.3, 0],
    mobile: { pos: [1.6, 0.55, 4.4], target: [0.3, 0.66, 2.1], fov: 34, shift: [0, 0.3] },
  },
  {
    id: 'rev', title: 'V10',
    pos: [1.75, 2.35, 3.7], target: [0.15, 0.85, 1.35], fov: 32, shift: [0.3, 0],
    mobile: { pos: [1.6, 2.6, 3.9], target: [0.15, 0.85, 1.35], fov: 40, shift: [0, 0.3] },
  },
  {
    id: 'wheels', title: 'Wheels and brakes',
    pos: [2.35, 0.42, 2.5], target: [0.82, 0.34, 1.45], fov: 26, shift: [0.32, 0],
    mobile: { pos: [2.3, 0.45, 2.6], target: [0.82, 0.34, 1.45], fov: 34, shift: [0, 0.3] },
  },
  {
    id: 'gills', title: 'Gills',
    pos: [2.7, 0.85, 1.75], target: [1.0, 0.66, 1.0], fov: 26, shift: [0.32, 0],
    mobile: { pos: [2.6, 0.9, 1.9], target: [1.0, 0.66, 1.0], fov: 30, shift: [0, 0.3] },
  },
  {
    id: 'roof', title: 'Carbon roof',
    pos: [1.1, 4.9, -1.6], target: [0, 1.2, -0.25], fov: 30, shift: [0.3, 0],
    mobile: { pos: [0.8, 5.6, -1.4], target: [0, 1.2, -0.25], fov: 38, shift: [0, 0.3] },
  },
  {
    id: 'sound', title: 'Tail and sound',
    via: [[4.8, 0.7, -3.6]], // round the rear corner without dipping under the road
    pos: [1.35, 0.38, -4.4], target: [0.25, 0.36, -2.3], fov: 28, shift: [0.3, 0],
    mobile: { pos: [1.3, 0.45, -4.6], target: [0.2, 0.38, -2.3], fov: 36, shift: [0, 0.3] },
  },
  {
    id: 'smg', title: 'SMG III',
    pos: [7.2, 0.55, 0.3], target: [0, 0.55, 0.05], fov: 28, shift: [0.28, 0],
    mobile: { pos: [8.6, 0.8, 0.3], target: [0, 0.55, 0.05], fov: 34, shift: [0, 0.32] },
  },
  {
    id: 'specs', title: 'Spec sheet',
    via: [[8.2, 2.4, 1.5], [5.2, 1.2, 6.2]], // wide orbit down the left side to the front
    pos: [6.2, 4.2, -6.4], target: [0, 0.4, 0], fov: 30, shift: [0.3, 0],
    mobile: { pos: [6.8, 5.2, -7.2], target: [0, 0.4, 0], fov: 38, shift: [0, 0.32] },
  },
  {
    id: 'outro', title: 'Final shot', lights: true,
    beam: 0.03, // the camera stands in the beams: keep the road under it from burning out (picked by eye)
    pos: [0, 0.72, 7.4], target: [0, 0.62, 0], fov: 24, shift: [0.32, 0],
    mobile: { pos: [0, 0.8, 8.4], target: [0, 0.62, 0], fov: 30, shift: [0, 0.32] },
  },
];
