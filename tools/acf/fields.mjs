// Builds the theme's ACF Local JSON field groups (acf-json/*.json) from a compact description.
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const now = Math.floor(Date.now() / 1000);
let order = 0;

const base = (type, name, label, instructions, extra = {}) => ({
  key: `field_msport_${name}`,
  label,
  name,
  aria_label: '',
  type,
  instructions,
  required: 0,
  conditional_logic: 0,
  wrapper: { width: '', class: '', id: '' },
  ...extra,
});

const f = {
  tab: (id, label) => ({ ...base('tab', '', label, ''), key: `field_msport_tab_${id}`, placement: 'left', endpoint: 0, selected: 0 }),
  msg: (id, label, message) => ({ ...base('message', '', label, ''), key: `field_msport_msg_${id}`, message, new_lines: 'wpautop', esc_html: 0 }),
  text: (name, label, ins, def = '', extra = {}) => base('text', name, label, ins, { default_value: def, maxlength: '', placeholder: '', prepend: '', append: '', ...extra }),
  area: (name, label, ins, def = '', rows = 4) => base('textarea', name, label, ins, { default_value: def, maxlength: '', rows, placeholder: '', new_lines: '' }),
  bool: (name, label, ins, def = 1, on = 'On', off = 'Off') => base('true_false', name, label, ins, { message: '', default_value: def, ui: 1, ui_on_text: on, ui_off_text: off }),
  url: (name, label, ins) => base('url', name, label, ins, { default_value: '', placeholder: 'https://' }),
  email: (name, label, ins) => base('email', name, label, ins, { default_value: '', placeholder: '', prepend: '', append: '' }),
  num: (name, label, ins, def = '', extra = {}) => base('number', name, label, ins, { default_value: def, min: '', max: '', step: '', placeholder: '', prepend: '', append: '', ...extra }),
  range: (name, label, ins, def, min, max, step) => base('range', name, label, ins, { default_value: def, min, max, step, prepend: '', append: '' }),
  color: (name, label, ins, def) => base('color_picker', name, label, ins, { default_value: def, enable_opacity: 0, return_format: 'string' }),
  image: (name, label, ins) => base('image', name, label, ins, { return_format: 'id', library: 'all', min_width: '', min_height: '', min_size: '', max_width: '', max_height: '', max_size: '', mime_types: 'jpg,jpeg,png,webp,avif', preview_size: 'medium' }),
  file: (name, label, ins, mime) => base('file', name, label, ins, { return_format: 'id', library: 'all', min_size: '', max_size: '', mime_types: mime }),
  post: (name, label, ins, types) => base('post_object', name, label, ins, { post_type: types, post_status: ['publish'], taxonomy: '', return_format: 'id', multiple: 0, allow_null: 1, bidirectional: 0, ui: 1, bidirectional_target: [] }),
  repeater: (name, label, ins, subs, { min = 0, max = 0, button = 'Add row', layout = 'table', collapsed = '' } = {}) =>
    base('repeater', name, label, ins, {
      layout, pagination: 0, min, max, collapsed: collapsed ? `field_msport_${name}__${collapsed}` : '', button_label: button, rows_per_page: 20,
      sub_fields: subs.map((s) => ({ ...s, key: `field_msport_${name}__${s.name}`, parent_repeater: `field_msport_${name}` })),
    }),
};

const half = (field) => ({ ...field, wrapper: { ...field.wrapper, width: '50' } });

// Stills, show and anchor: the common fields of a chapter (docs/CONTENT-MODEL.md).
const common = (p, anchor, stills = true) => [
  f.bool(`${p}_show`, 'Show chapter', 'Turn off to hide this chapter. The camera skips it too.', 1, 'Shown', 'Hidden'),
  f.text(`${p}_anchor`, 'Anchor ID', `Used by the menu: a menu link "#${anchor}" scrolls here. Lowercase letters, numbers and dashes only. Change the menu link too if you change this.`, anchor),
  ...(stills
    ? [
        half(f.image(`${p}_still`, 'Still, desktop', 'Render of this chapter\'s camera angle, landscape 16:9, 2560 × 1440 px. Shown when 3D is off (reduced motion, weak devices, effects off).')),
        half(f.image(`${p}_still_mobile`, 'Still, mobile', 'Optional. Render of the portrait camera angle, 9:19.5 (a phone screen), 1200 × 2600 px. Used on portrait screens. If empty, the desktop still is cropped using the focal point.')),
        f.text(`${p}_focal`, 'Focal point', 'Which part of the still must stay visible when it is cropped: horizontal and vertical position in %, for example "50% 50%" (centre) or "30% 60%".', '50% 50%', { placeholder: '50% 50%' }),
      ]
    : []),
];

const heading = (p, def) => f.text(`${p}_title`, 'Heading', 'Chapter heading. Short: one line on a laptop.', def);
const body = (p, ins = 'Two or three sentences. Line breaks start a new paragraph.') => f.area(`${p}_text`, 'Text', ins);

// ---------------------------------------------------------------- Options page
const settings = {
  key: 'group_msport_settings',
  title: 'M6 Settings',
  fields: [
    f.tab('opt_header', 'Header'),
    f.text('opt_wordmark', 'Wordmark', 'Text shown in the top left corner instead of a logo.', 'M6 E63'),
    half(f.text('opt_header_cta_label', 'Header button label', 'The button in the top right corner. Name the action.', 'Hear the V10')),
    half(f.text('opt_header_cta_anchor', 'Header button target', 'Anchor ID of the chapter the button scrolls to (see Front page → each chapter → Anchor ID).', 'sound')),
    half(f.text('opt_menu_label', 'Menu button label', 'The button that opens the menu on phones and tablets.', 'Menu')),
    half(f.text('opt_menu_close_label', 'Menu button label when open', 'The same button while the menu is open.', 'Close')),
    half(f.text('opt_skip_label', 'Skip link', 'Hidden link for keyboard users: it appears on the first Tab press and jumps over the header.', 'Skip to content')),
    half(f.text('opt_nav_label', 'Menu name for screen readers', 'Not shown on screen. Screen readers announce the header menu by this name.', 'Chapters')),

    f.tab('opt_footer', 'Footer'),
    half(f.text('opt_dev_name', 'Developer name', 'Footer credit, for example your name or studio.')),
    half(f.url('opt_dev_url', 'Developer link', 'Portfolio or Upwork profile. The name above links here, and so does the button of the last chapter unless it has its own link.')),
    f.repeater('opt_social', 'Social links', 'Optional. Shown in the footer in this order.', [
      f.text('label', 'Label', 'For example "Instagram".'),
      f.url('url', 'Link', 'Full address.'),
    ], { button: 'Add link' }),
    f.text('opt_footer_nav_label', 'Footer menu name for screen readers', 'Not shown on screen. Screen readers announce the footer menu by this name.', 'Footer'),

    f.tab('opt_sound', 'Sound'),
    f.file('opt_sound_file', 'V10 sound file', 'The engine recording for the "Play the V10" buttons. MP3, M4A, OGG or WebM, up to 15 seconds and 400 KB. If empty, the recording that comes with the theme is used.', 'mp3,m4a,ogg,webm'),
    f.text('opt_sound_credit', 'Sound credit', 'Optional. Shown next to the player, for example who recorded it.'),

    f.tab('opt_effects', 'Effects'),
    f.bool('opt_effects_enabled', '3D and scroll effects', 'Turns the 3D car and all scroll scenes on or off for the whole site. When off, visitors see the still images. Use it for testing or on weak hosting.', 1, 'On', 'Off'),

    f.tab('opt_404', 'Page not found'),
    f.text('opt_404_title', 'Title', 'Shown when a page does not exist (404).', 'You hit the limiter.'),
    f.area('opt_404_text', 'Text', 'One sentence under the title.', 'This page does not exist. The car is still running on the front page.', 2),
    half(f.text('opt_404_button', 'Button label', 'The button back to the front page. Also used on an empty list page.', 'Back to the car')),
    half(f.text('opt_empty_title', 'Empty list title', 'Title of a list page that has nothing to show (for example a search with no results).', 'Nothing here yet')),

    f.tab('opt_seo', 'Search engines'),
    f.area('opt_meta_description', 'Page description', 'Shown by Google and in link previews under the page title. One or two sentences, up to 160 characters. If empty, the Tagline from Settings → General is used.', '', 3),
  ],
  location: [[{ param: 'options_page', operator: '==', value: 'msport-settings' }]],
  menu_order: 0,
  description: 'Site-wide settings: header, footer, sound, effects, 404.',
};

// ---------------------------------------------------------------- Front page
const front = {
  key: 'group_msport_front',
  title: 'Front page',
  fields: [
    f.msg('intro', 'How this page works', 'The front page is one 3D film around the car. Each tab on the left is one chapter, in page order. <strong>Camera angles and effects are part of the theme</strong>; here you edit the texts, numbers and still images.'),

    f.tab('hero', '1 · Hero'),
    ...common('hero', 'top'),
    f.text('hero_title', 'Headline', 'The main headline of the site (the only H1). Keep it under 40 characters.', 'Ten cylinders. 8,250 rpm.', { maxlength: 60 }),
    f.area('hero_text', 'Sentence', 'One or two lines under the headline.', '', 3),
    half(f.text('hero_cta_label', 'Button label', 'Name the action, for example "See the spec sheet".', 'See the spec sheet')),
    half(f.text('hero_cta_anchor', 'Button target', 'Anchor ID of the chapter the button scrolls to.', 'specs')),

    f.tab('scene', '3D scene'),
    f.msg('scene_note', 'The car', 'These settings apply to the whole film. Leave the files empty to use the model and lighting that come with the theme.'),
    half(f.file('scene_model', '3D model, desktop', 'Optional. Prepared .glb file, up to 4 MB. If empty, the theme\'s model is used.', 'glb')),
    half(f.file('scene_model_mobile', '3D model, mobile', 'Optional. Lighter .glb, up to 2 MB. If empty, the desktop model is used.', 'glb')),
    f.file('scene_env', 'Reflections (night HDRI)', 'Optional. .hdr or .ktx2, up to 1 MB. Sets what the paint reflects. If empty, the theme\'s night city is used.', 'hdr,ktx2'),
    { ...f.color('scene_paint', 'Paint colour', 'Base colour of the car. Default is Black Sapphire Metallic (#050608). Applies to the live 3D scene; phones and slower computers play a pre-rendered video with the default look, which has to be rendered again after a change (DESIGN.md → Video version).', '#050608'), wrapper: { width: '33', class: '', id: '' } },
    { ...f.range('scene_clearcoat_roughness', 'Paint gloss', 'Lower is glossier. Default 0.012. Applies to the live 3D scene; phones and slower computers play a pre-rendered video with the default look, which has to be rendered again after a change (DESIGN.md → Video version).', 0.012, 0, 0.2, 0.001), wrapper: { width: '33', class: '', id: '' } },
    { ...f.range('scene_speed', 'Driving speed', 'Speed of the road, wheels and street lights. Default 1. Applies to the live 3D scene; phones and slower computers play a pre-rendered video with the default look, which has to be rendered again after a change (DESIGN.md → Video version).', 1, 0.5, 2, 0.1), wrapper: { width: '33', class: '', id: '' } },
    f.text('scene_model_credit', 'Model credit', 'Shown in the footer. Keep the author and licence of the 3D model here.', '3D model “BMW M6 (E63)” by Mona x Supercars, CC BY 4.0.'),

    f.tab('front', '2 · Nose and lights'),
    ...common('front', 'front'),
    heading('front', 'Nose and lights'),
    body('front'),

    f.tab('rev', '3 · V10'),
    ...common('rev', 'rev'),
    heading('rev', 'The V10'),
    body('rev', 'Short story of the engine. Two or three sentences.'),
    { ...f.num('rev_idle', 'Idle rpm', 'Where the needle rests. Default 800.', 800, { min: 0, max: 3000, step: 50, append: 'rpm' }), wrapper: { width: '33', class: '', id: '' } },
    { ...f.num('rev_redzone_start', 'Red zone starts at', 'Start of the red arc on the dial. Default 7500.', 7500, { min: 3000, max: 12000, step: 50, append: 'rpm' }), wrapper: { width: '33', class: '', id: '' } },
    { ...f.num('rev_redline', 'Redline', 'Top of the dial and the limiter. Default 8250.', 8250, { min: 3000, max: 12000, step: 50, append: 'rpm' }), wrapper: { width: '33', class: '', id: '' } },
    f.repeater('rev_figures', 'Figures', 'Big numbers that count up while the needle climbs. One to four rows. "At rpm" is where the counter reaches its value.', [
      f.num('value', 'Value', '', '', { step: 'any' }),
      f.text('unit', 'Unit', 'PS, Nm, rpm…'),
      f.text('label', 'Label', 'Power, Torque…'),
      f.num('at_rpm', 'At rpm', '', '', { min: 0, max: 12000, step: 50 }),
    ], { min: 1, max: 4, button: 'Add figure' }),
    f.text('rev_sound_label', 'Sound button label', 'Plays the V10 recording from M6 Settings → Sound.', 'Play the V10'),
    half(f.text('rev_tacho_scale', 'Dial scale label', 'Small label inside the tachometer above the needle hub.', '×1000 rpm')),
    half(f.text('rev_tacho_unit', 'Readout unit', 'Unit under the rpm readout of the tachometer.', 'rpm')),
    f.text('rev_tacho_title', 'Tachometer description', 'Not shown on screen: screen readers read it instead of the drawing. {redline} and {redzone} are replaced with the numbers above.', 'Tachometer: the needle at {redline} rpm, red zone from {redzone} rpm.'),

    f.tab('wheels', '4 · Wheels and brakes'),
    ...common('wheels', 'wheels'),
    heading('wheels', 'Wheels and brakes'),
    body('wheels'),
    f.repeater('wheels_numbers', 'Numbers', 'Up to three big numbers. The value is text, so "4.6" or "0–100" both work. The note is an optional small footnote.', [
      f.text('value', 'Value', ''),
      f.text('unit', 'Unit', ''),
      f.text('label', 'Label', ''),
      f.text('note', 'Note', 'Optional.'),
    ], { max: 3, button: 'Add number' }),

    f.tab('gills', '5 · Gills'),
    ...common('gills', 'gills'),
    heading('gills', 'Gills'),
    body('gills'),

    f.tab('roof', '6 · Carbon roof'),
    ...common('roof', 'roof'),
    heading('roof', 'Carbon roof'),
    body('roof'),

    f.tab('sound', '7 · Tail and sound'),
    ...common('sound', 'sound'),
    heading('sound', 'Tail and sound'),
    body('sound'),
    half(f.text('sound_play_label', 'Play label', 'Button label while the sound is stopped. The recording is set in M6 Settings → Sound.', 'Play the V10')),
    half(f.text('sound_pause_label', 'Pause label', 'Button label while the sound plays.', 'Pause')),

    f.tab('smg', '8 · SMG III'),
    ...common('smg', 'smg'),
    heading('smg', 'SMG III'),
    body('smg', 'One or two sentences about the gearbox.'),
    f.repeater('smg_gears', 'Gears', 'Exactly seven rows, one line of copy per gear. They appear one by one as the gearbox shifts.', [
      { ...f.text('gear', 'Gear', '1 to 7.'), wrapper: { width: '15', class: '', id: '' } },
      f.text('line', 'Line', 'One short sentence.'),
    ], { min: 7, max: 7, button: 'Add gear' }),

    f.tab('spec', '9 · Spec sheet'),
    ...common('spec', 'specs', false),
    heading('spec', 'Spec sheet'),
    f.repeater('spec_groups', 'Tables', 'One table per group (Engine, Transmission…). Each row is label, value and unit.', [
      f.text('group_title', 'Group', 'For example "Engine".'),
      f.repeater('rows', 'Rows', '', [
        f.text('label', 'Label', ''),
        f.text('value', 'Value', ''),
        f.text('unit', 'Unit', 'Optional.'),
      ], { button: 'Add row' }),
    ], { layout: 'block', button: 'Add table', collapsed: 'group_title' }),
    f.text('spec_source', 'Source note', 'Where the figures come from. Shown under the tables.'),

    f.tab('outro', '10 · Final shot'),
    ...common('outro', 'contact'),
    heading('outro', 'End of the run.'),
    body('outro', 'Who made this site and how to reach them. Two or three sentences.'),
    half(f.text('outro_cta_label', 'Button label', 'Name the action, for example "Get in touch". Leave empty to hide the button.', 'Get in touch')),
    half(f.text('outro_cta_link', 'Button link', 'A web address (https://…) or an email address. If empty, the Developer link from M6 Settings → Footer is used.')),
  ],
  location: [[{ param: 'page_type', operator: '==', value: 'front_page' }]],
  menu_order: 0,
  description: 'Texts, numbers and stills of the 10 chapters of the front page film.',
};

for (const g of [settings, front]) {
  g.fields = g.fields.map((fld) => ({ ...fld, menu_order: order++ }));
  const json = {
    ...g,
    position: 'acf_after_title',
    style: 'seamless',
    label_placement: 'top',
    instruction_placement: 'label',
    hide_on_screen: ['the_content', 'excerpt', 'discussion', 'comments', 'revisions', 'slug', 'author', 'format', 'categories', 'tags', 'send-trackbacks'],
    active: true,
    show_in_rest: 0,
    modified: now,
  };
  if (g.key === 'group_msport_settings') json.hide_on_screen = '';
  writeFileSync(`${out}/${g.key}.json`, JSON.stringify(json, null, 4) + '\n');
  console.log(g.key, g.fields.length, 'fields');
}
