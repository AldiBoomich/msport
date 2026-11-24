// Builds the theme's ACF Local JSON field groups (acf-json/*.json) from a compact description (docs/CONTENT-MODEL.md).
// Usage: node tools/acf/fields.mjs acf-json
import { writeFileSync } from 'node:fs';

const out = process.argv[2] || 'acf-json';
const now = Math.floor(Date.now() / 1000);

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
  text: (name, label, ins, def = '', extra = {}) => base('text', name, label, ins, { default_value: def, maxlength: '', placeholder: '', prepend: '', append: '', ...extra }),
  area: (name, label, ins, def = '', rows = 3) => base('textarea', name, label, ins, { default_value: def, maxlength: '', rows, placeholder: '', new_lines: '' }),
  bool: (name, label, ins, def = 1, on = 'Shown', off = 'Hidden') => base('true_false', name, label, ins, { message: '', default_value: def, ui: 1, ui_on_text: on, ui_off_text: off }),
  url: (name, label, ins) => base('url', name, label, ins, { default_value: '', placeholder: 'https://' }),
  num: (name, label, ins, def = '', extra = {}) => base('number', name, label, ins, { default_value: def, min: '', max: '', step: '', placeholder: '', prepend: '', append: '', ...extra }),
  image: (name, label, ins) => base('image', name, label, ins, { return_format: 'id', library: 'all', min_width: '', min_height: '', min_size: '', max_width: '', max_height: '', max_size: '', mime_types: 'jpg,jpeg,png,webp,avif', preview_size: 'medium' }),
  file: (name, label, ins, mime) => base('file', name, label, ins, { return_format: 'id', library: 'all', min_size: '', max_size: '', mime_types: mime }),
  repeater: (name, label, ins, subs, { min = 0, max = 0, button = 'Add row', layout = 'table', collapsed = '' } = {}) =>
    base('repeater', name, label, ins, {
      layout, pagination: 0, min, max, collapsed: collapsed ? `field_msport_${name}__${collapsed}` : '', button_label: button, rows_per_page: 20,
      sub_fields: subs.map((s) => ({
        ...s,
        key: `field_msport_${name}__${s.name}`,
        parent_repeater: `field_msport_${name}`,
        ...(s.type === 'repeater' ? { sub_fields: s.sub_fields.map((ss) => ({ ...ss, key: `field_msport_${name}__${s.name}__${ss.name}`, parent_repeater: `field_msport_${name}__${s.name}` })) } : {}),
      })),
    }),
};

const half = (field) => ({ ...field, wrapper: { ...field.wrapper, width: '50' } });
const third = (field) => ({ ...field, wrapper: { ...field.wrapper, width: '33' } });

// Show + anchor: the common fields of a chapter.
const common = (p, anchor, nav) => [
  third(f.bool(`${p}_show`, 'Show chapter', 'Turn off to hide this chapter (the chapter rail skips it too).')),
  third(f.text(`${p}_nav`, 'Name in the chapter rail', 'One or two words.', nav)),
  third(f.text(`${p}_anchor`, 'Anchor ID', `A link "#${anchor}" scrolls here. Lowercase letters, numbers and dashes only.`, anchor)),
];
const title = (p, ins = 'One line per line of the heading (press Enter for a new line). Short: 2–4 words per line.') => f.area(`${p}_title`, 'Heading', ins);

// ---------------------------------------------------------------- Front page
const front = {
  key: 'group_msport_front',
  title: 'M6 front page',
  fields: [
    f.tab('hero', 'Hero'),
    ...common('hero', 'top', 'Start'),
    f.text('hero_wordmark', 'Big wordmark', 'Large model name behind the headline, for example "M6".', 'M6'),
    title('hero', 'The only main heading of the page (h1). One line per line of the heading.'),
    f.area('hero_lead', 'Lead', 'One or two sentences under the heading.'),
    f.text('hero_cta_label', 'Button label', 'The button scrolls to the POWER chapter. Name the action.', 'Hear the V10'),
    half(f.image('hero_image', 'Car, desktop', 'Cut-out car on a transparent background (PNG or WebP), at least 2560 px wide. It stands on the studio backdrop.')),
    half(f.image('hero_image_mobile', 'Car, phone', 'Optional. A cut-out framed for a tall phone screen. If empty, the desktop image is used.')),

    f.tab('profile', 'Profile'),
    ...common('profile', 'profile', 'Profile'),
    f.image('profile_image', 'Side profile', 'Cut-out car seen exactly from the side, transparent background, at least 2560 px wide.'),
    f.text('profile_ghost', 'Big badge behind the car', 'Decorative, not read aloud; set in the BMW M badge manner with the three M stripes. For example "M6".', 'M6'),
    f.repeater('profile_figures', 'Figures', 'Three or four true numbers. Value without the unit.', [
      f.text('value', 'Value', 'For example "507" or "4.6".'),
      f.text('unit', 'Unit', 'For example "PS", "rpm", "s", "km/h".'),
      f.text('label', 'Label', 'For example "0–100 km/h".'),
    ], { button: 'Add figure', max: 4 }),

    f.tab('design', 'Design'),
    ...common('design', 'design', 'Design'),
    title('design'),
    f.area('design_lead', 'Lead', 'One or two sentences.'),
    f.image('design_image', 'Car', 'Cut-out car, three-quarter view, transparent background, at least 2560 px wide. The hotspots sit on this picture.'),
    f.repeater('design_hotspots', 'Hotspots', 'Points on the car. X and Y are the position on the picture in % (0 = left / top, 100 = right / bottom). Open the page to check where a point lands.', [
      f.num('x', 'X, %', '', '', { min: 0, max: 100, step: 0.1 }),
      f.num('y', 'Y, %', '', '', { min: 0, max: 100, step: 0.1 }),
      f.text('label', 'Label', 'Shown next to the point, 1–3 words.'),
      f.text('title', 'Panel heading', 'Heading of the detail panel.'),
      f.area('text', 'Panel text', 'Two or three sentences.', '', 4),
      f.image('image', 'Detail photo', 'Landscape 3:2, at least 1200 × 800 px.'),
    ], { button: 'Add hotspot', layout: 'block', collapsed: 'label', max: 6 }),

    f.tab('power', 'V10 / POWER'),
    ...common('power', 'power', 'V10'),
    title('power'),
    f.area('power_lead', 'Lead', 'Two or three sentences about the engine.'),
    f.image('power_image', 'Engine photo', 'Landscape 3:2.'),
    f.repeater('power_specs', 'Engine facts', 'Short facts next to the tachometer.', [
      f.text('label', 'Label', 'For example "Displacement".'),
      f.text('value', 'Value', 'For example "4,999".'),
      f.text('unit', 'Unit', 'For example "cc".'),
    ], { button: 'Add fact', max: 6 }),
    third(f.num('power_from', 'Output in P400', 'Shown before POWER is pressed.', 400)),
    third(f.num('power_to', 'Output in P500', 'Shown after POWER is pressed.', 507)),
    third(f.text('power_unit', 'Output unit', '', 'PS')),
    third(f.text('power_mode_off', 'Mode name, before', '', 'P400')),
    third(f.text('power_mode_on', 'Mode name, after', '', 'P500')),
    third(f.text('power_button_label', 'Button label', '', 'POWER')),
    f.text('power_hint', 'Hint', 'Shown next to the button before the first press.', 'Press POWER. Sound on.'),
    third(f.num('power_idle', 'Idle, rpm', '', 800)),
    third(f.num('power_redline', 'Redline, rpm', 'Start of the red zone.', 8250)),
    third(f.num('power_scale_max', 'Scale end, rpm', '', 9000)),

    f.tab('drive', 'Drive'),
    ...common('drive', 'drive', 'Drive'),
    title('drive'),
    f.area('drive_text', 'Text', 'Two or three sentences. A blank line starts a new paragraph.', '', 5),
    f.repeater('drive_photos', 'Photos', 'Three or four photos for the collage. The first one is the biggest.', [
      f.image('image', 'Photo', 'At least 1600 px on the long side.'),
      f.text('caption', 'Caption', 'Short, for example "SMG III lever".'),
    ], { button: 'Add photo', max: 4 }),

    f.tab('specs', 'Spec sheet'),
    ...common('specs', 'specs', 'Spec sheet'),
    title('specs'),
    f.repeater('specs_tabs', 'Tabs', 'One tab per group: Engine, Gearbox, Chassis, Dimensions.', [
      f.text('label', 'Tab name', ''),
      f.image('image', 'Photo', 'Landscape 3:2.'),
      f.repeater('rows', 'Rows', '', [f.text('label', 'Label', ''), f.text('value', 'Value', 'With the unit, for example "520 Nm at 6,100 rpm".')], { button: 'Add row' }),
    ], { button: 'Add tab', layout: 'block', collapsed: 'label', max: 6 }),

    f.tab('heritage', 'Heritage'),
    ...common('heritage', 'heritage', 'Heritage'),
    title('heritage'),
    f.area('heritage_text', 'Text', 'Two or three sentences.', '', 4),
    half(f.image('heritage_then_image', 'Then: photo', 'The ancestor, shown in black and white.')),
    half(f.text('heritage_then_caption', 'Then: caption', 'For example "M635CSi, 1983".')),
    half(f.image('heritage_now_image', 'Now: photo', 'Optional. If empty, the hero car is used.')),
    half(f.text('heritage_now_caption', 'Now: caption', 'For example "M6, 2005".')),

    f.tab('outro', 'Outro'),
    ...common('outro', 'contact', 'Contact'),
    title('outro', 'Big closing heading. One line per line; the lines are set in steps.'),
    f.area('outro_text', 'Text', 'One or two sentences about who built this page.'),
    f.text('outro_cta_label', 'Button label', 'Links to the developer link from M6 Settings.', 'Get in touch'),
  ],
  location: [[{ param: 'page_type', operator: '==', value: 'front_page' }]],
  menu_order: 0,
  position: 'acf_after_title',
  style: 'default',
  label_placement: 'top',
  instruction_placement: 'label',
  hide_on_screen: ['the_content', 'excerpt', 'discussion', 'comments', 'slug', 'author', 'format', 'featured_image', 'categories', 'tags', 'send-trackbacks'],
  active: true,
  description: 'Every chapter of the M6 page (docs/CONTENT-MODEL.md).',
  show_in_rest: 0,
  modified: now,
};

// ---------------------------------------------------------------- Options page
const settings = {
  key: 'group_msport_settings',
  title: 'M6 Settings',
  fields: [
    f.tab('opt_header', 'Header'),
    half(f.text('opt_wordmark', 'Wordmark', 'Text in the top left corner instead of a logo.', 'M6')),
    half(f.text('opt_header_cta_label', 'Header button', 'Scrolls to the POWER chapter.', 'Hear the V10')),
    half(f.text('opt_menu_label', 'Menu button', 'The button that opens the menu on phones.', 'Menu')),
    half(f.text('opt_close_label', 'Close label', 'Closes the menu and the detail panel.', 'Close')),
    half(f.text('opt_skip_label', 'Skip link', 'Appears on the first Tab press.', 'Skip to content')),
    half(f.text('opt_nav_label', 'Chapter menu name', 'Not shown; screen readers announce the chapter rail by this name.', 'Chapters')),

    f.tab('opt_footer', 'Developer and credits'),
    half(f.text('opt_dev_name', 'Developer name', 'Footer credit.')),
    half(f.url('opt_dev_url', 'Developer link', 'Portfolio or Upwork profile.')),
    half(f.text('opt_dev_prefix', 'Text before the developer name', '', 'Page by')),
    half(f.text('opt_credits_label', 'Credits button', 'Opens the list of credits in the footer.', 'Photo and sound credits')),
    f.area('opt_credits', 'Photo and sound credits', 'One credit per line.', '', 8),

    f.tab('opt_sound', 'Sound'),
    f.file('opt_sound_file', 'V10 recording', 'MP3. If empty, the recording shipped with the theme is used.', 'mp3'),
    f.area('opt_rpm_curve', 'Rev curve', 'Only for a different recording: JSON [[seconds, rpm], …] built by tools/audio/rpm-curve.py. If empty, the curve of the recording shipped with the theme is used.', '', 4),

    f.tab('opt_meta', 'Search and 404'),
    f.area('opt_meta_description', 'Meta description', 'One sentence for search engines.', '', 2),
    f.text('opt_404_title', '404 heading', '', 'You hit the limiter.'),
    f.area('opt_404_text', '404 text', '', 'This page does not exist.', 2),
    f.text('opt_404_button', '404 button', '', 'Back to the M6'),
  ],
  location: [[{ param: 'options_page', operator: '==', value: 'msport-settings' }]],
  menu_order: 0,
  position: 'normal',
  style: 'default',
  label_placement: 'top',
  instruction_placement: 'label',
  hide_on_screen: '',
  active: true,
  description: 'Site-wide texts and files.',
  show_in_rest: 0,
  modified: now,
};

for (const g of [front, settings]) {
  writeFileSync(`${out}/${g.key}.json`, JSON.stringify(g, null, 4) + '\n');
  console.log(`${out}/${g.key}.json: ${g.fields.length} fields`);
}
