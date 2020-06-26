# @pwa-manifest/core
Core package for PWA manifest generation. Can be integrated into a build pipeline. Handles user input directly, no need to clean it.

## Documentation
This package exports a single class `PWAManifestGenerator`. It uses ES Modules for exports.

ES Modules/TypeScript import:
```js
import PWAManifestGenerator from '@pwa-manifest/core';
```
CommonJS/Node.js import:
```js
const PWAManifestGenerator = require('@pwa-manifest/core').default;
```

To construct a `PWAManifestGenerator` object, instantiate with the `new` keyword and the options for generation. (The list of options are detailed below.)
```js
const generator = new PWAManifestGenerator({
  name: 'My Awesome PWA',
  shortName: 'My PWA',
  startURL: './offline',
  theme: '#add8e6',
  iconGenerationOptions: {
    baseIcon: './public/my-awesome-icon.svg',
    sizes: [192, 384, 512],
    genFavicons: true
  }
});
```
You can also optionally pass in a `resolveDir` (from which relative paths are resolved, defaults to the current working directory), a `baseURL` (from which all generated filepaths will begin, defaults to `'/'`), and default options (which will take the place of missing parameters in the actual options object. This is mainly for plugin developers.)
```js
const opts = JSON.parse(fs.readFileSync('myConfig.json').toString());
const generator = new PWAManifestGenerator(opts, {
  baseURL: '.',
  resolveDir: __dirname
}, {
  name: 'Default App Name',
  description: 'A default description!',
  theme: 'yellow'
});
```
After you create the generator, you can generate the manifest, HTML to be injected, Microsoft Browser Config, and icons easily with the asynchronous `generate()` method.

To convert the HTML insertion array into a string, use the `htmlInsertToString` method:
```js
const {
  default: PWAManifestGenerator,
  htmlInsertToString
} = require('@pwa-manifest/core');
/* Use the following for ES Modules:
import PWAManifestGenerator, { htmlInsertToString } from '@pwa-manifest/core';
*/

async function generateFromOpts(opts) {
  const generator = new PWAManifestGenerator(opts);
  const generation = await generator.generate();
  fs.writeFileSync('manifest.webmanifest', JSON.stringify(generation.manifest));
  fs.writeFileSync('browserconfig.xml', generation.browserConfig);
  for (const filename in generation.generatedFiles) {
    fs.writeFileSync(filename, generation.generatedFiles[filename]);
  }
  let html = fs.readFileSync('index.html').toString();
  const htmlHeadIndex = html.indexOf('</head>');
  html = html.slice(0, htmlHeadIndex)
         + generation.html.map(htmlInsertToString).join('')
         + html.slice(htmlHeadIndex);
  fs.writeFileSync('index.html', html);
}
```
If you need to generate one type of icon at a time, just call the respective method manually, and it will add the result into the generator object:
```js
await generator.genAppleTouchIcon();
// generator.generatedFiles now contains the Apple Touch Icon
```

## Options

Almost anything that usually goes in a `manifest.webmanifest` file can go into the options. All parameter names have aliases in the original form from the spec (like `start_url`), in camel case (recommended, like `startUrl`), in kebab case (like `start-url`), and in other reasonable forms (like `startURL`). If you see any inconsistencies in the documentation, it's probably fine; you can use multiple names for the same value.

All parameters that exist in the [MDN documentation for the Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) are aliased, type-checked, and insterted into the manifest whenever provided in `pwaManifest`. There are a few reasonable defaults, like `'.'` for `start_url`. Watch out for two changes, though: the removal of the `icons` option to allow icon generation and the modification of the `screenshots` option's behavior (detailed below).

If you need to have a parameter not included in that list, put an array of parameter names to keep in the final manifest under the `include` key. If you use an unknown parameter name and don't put it in `include`, the generation will throw an error.

### Changes from standard manifest

The `theme_color` (aka `theme`) will default to white and will change the default behavior of some parts of the icon generation, such as the background color of the Microsoft Tile.

The `screenshots`, unlike in a normal web app manifest, should be an array of screenshot image filepaths or absolute URLs. Do not use relative URLs or they will be confused for filepaths. Each image should be a PNG, JPEG, or WebP file.

Instead of manually setting an `icons` parameter containing a set of icons, you should use `genIconOpts` (aka `iconGenerationOptions`, `iconGenOpts`, ...you get the gist). `genIconOpts` will contain the options for icon generation. The parameters for `genIconOpts` are as follows:
#### `baseIcon`
The path to the icon to generate all other icons from. Path is relative to the `resolveDir`.
- For best results, use a high-resolution (at least 512x512) PNG or an SVG.
#### `sizes`
An array of pixel values for the sizes to generate. Defaults to `[96, 152, 192, 384, 512]`.
- All PWAs need at least 192px and 512px icons, so those will be added in regardless of whether they are provided in the `sizes` parameter.
#### `formats`
An object whose keys are the desired output formats (in lowercase) and whose values are the configurations to use with the [`sharp`](https://sharp.pixelplumbing.com/en/stable/api-output/#png) package when generating icons of that type. By default, generates WebP and PNG images with somewhat high compression.
- If you prefer the user getting one format over another, put that format first in the object.
- All PWAs need at least PNG, so that's inserted first if you provide your own config. If you don't want it first, put your own `png` key-value pair in your config.
#### `appleTouchIconBG`
The background color for the Apple Touch Icon (to fill transparent regions). Defaults to the theme color.
- Useful because by default, Apple uses black for transparent regions, which doesn't look good with most icons.
- Recommended to use `atib` alias for brevity.
#### `appleTouchIconPadding`
The number of pixels to pad the Apple Touch Icon with on all sides. Defaults to 12.
- Used to account for Apple's courner-rounding.
- Recommended to use `atip` alias for brevity.
#### `genFavicons`
Whether or not to generate 16x16 and 32x32 favicons and insert links in the HTML. Defaults to `false`.
#### `genSafariPinnedTab`
Whether or not to generate a Safari Pinned Tab SVG icon using an autotracer. Defaults to `false`
- Has a significant impact on performance (not managed by `sharp` but by native JavaScript).
- Recommended to use `genPinnedTab` or `gspt` for brevity.
#### `safariPinnedTabColor`
The color for the Safari Pinned Tab icon. Defaults to the theme color (or `'black'` if no theme was manually specified).
- Recommended to use `pinnedTabColor` or `sptc` for brevity.
#### `msTileColor`
The background color for Microsoft Tiles. Defaults to the theme color.
#### `resizeMethod`
The method to use for resizing non-square images. Can be one of `'cover'` (default), `'contain'`, or `'fill'`.
#### `purpose`
An array of possible purposes for the icons. Each element should be one of `'badge'`, `'maskable'`, or `'any'`
#### `disabled`
Disables the manifest creation with no warning.
- Used to speed up builds when icon generation isn't needed (i.e. when developing with HMR)
#### `production` / `development`
The parameters to use when `NODE_ENV` is a certain value. Merged with the outer parameters.
- Useful for disabling/generating less icons in development
- Case-insensitive - use lowercase in options
- Can be anything. `production` and `development` are common, but you could hypothetically set your `NODE_ENV` to `asdf` and have an `asdf` key with custom manifest generation options

###  Advanced: Events
The generator has a rich event system. It extends `EventEmitter`, so you can use `.on(eventName)` to listen for them.

There are three types of event: `start`, `gen`, and `end`. Each of these events can apply to one of `defaultIcons`, `appleTouchIcon`, `favicon`, or `msTile`. Therefore, we have events for `defaultIconsStart`, `msTileEnd`, `faviconGen`, etc.

`start` events are called with a pretty string message about the status of the build you can log.

`gen` events are called with an object containing key `filename`, which maps to a promise resolving to the filename, and key `content`, which maps to a promise resolving to the raw image data. You can change the fields of these objects with your own promises in your event handlers to modify the output filename or content. Note that `gen` events can be called multiple times per build because they are called with each and every icon from the default icons and both generated favicons.

`end` events are not called with any extra information. They just notify when one task finishes.

There are three extra events that don't follow the above rules. The `'start'` event (where the event is the literal string `'start'` with no icon type) signifies the start of the generation as a whole and has no parameters. The `'end'` event signifies the end of the generaiton as a whole and has no parameters. The `'*'` event is a wildcard that can be used to listen for every event, and handlers are called with first the event name, then the original parameters from the event.

All these events can be confusing, so here's a quick example:
```js
generator.on('*', (eventName, ...eventParameters) => {
  if (eventName === 'start')
    console.log('Build started!')
  else if (eventName.endsWith('Start'))
    console.log(eventParameters[0]); // Nice message
  else if (eventName === 'end')
    console.log('Build finished!');
});
generator.on('faviconGen', ev => {
  /**
   * If you want your changes to apply, do NOT make the handler itself async!
   * Modify the event object synchronously, you can do asynchronous handling in
   * the promise itself.
   */
  ev.filename = ev.filename.then(originalFilename => {
    console.log('Modifying the name of', originalFilename);
    return 'modified-name-' + originalFilename;
  });
  /**
   * You'll want to do any postprocessing with your own image library here.
   * This example assumes you have a `tintRed` function that, when given a
   * Buffer containing image data, will return a buffer containing that image
   * data tinted red.
   */
  ev.content = ev.content.then(buf => tintRed(buf))
});
```

## License
MIT