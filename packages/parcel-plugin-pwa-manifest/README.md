# parcel-plugin-pwa-manifest

A Parcel plugin that generates a Web App Manifest, creates all the icons you need, and more!

NOTE: For Parcel 2 support, please see [`parcel-config-pwa-manifest`](https://npmjs.com/package/parcel-config-pwa-manifest).

## Usage
In `package.json`:
```json
{
  "name": "my-awesome-pwa",
  "description": "An awesome PWA to do awesome things",
  "pwaManifest": {
    "name": "My Awesome PWA",
    "shortName": "My PWA",
    "startURL": "./offline",
    "theme": "#add8e6",
    "generateIconOptions": {
      "baseIcon": "./public/my-awesome-icon.svg",
      "sizes": [192, 384, 512],
      "genFavicons": true
    }
  }
}
```

This will create a `manifest.webmanifest` similar to the following:
```json
{
  "name": "My Awesome PWA",
  "short_name": "My PWA",
  "description": "An awesome PWA to do awesome things",
  "start_url": "./offline",
  "theme_color": "#add8e6",
  "icons": [
    {
      "src": "./my-awesome-icon-192x192.webp",
      "sizes": "192x192",
      "type": "image/webp"
    },
    {
      "src": "./my-awesome-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./my-awesome-icon-384x384.webp",
      "sizes": "384x384",
      "type": "image/webp"
    },
    {
      "src": "./my-awesome-icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "./my-awesome-icon-512x512.webp",
      "sizes": "512x512",
      "type": "image/webp"
    },
    {
      "src": "./my-awesome-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
In `index.html`, a link to the manifest, an Apple Touch Icon, a Microsoft Tile configuration, and two favicons will be inserted at the top of the `<head>`.

## What?
This package is a plugin for the [Parcel bundler](https://parceljs.org) that creates a web manifest with reasonable defaults and inserts a link into the HTML. More importantly, it handles all icon/favicon generation for you when you provide a base icon, which lets you effortlessly support multiple screen sizes and ensure best practices.

## Why?
Parcel fully supports web manifests, but creating them can be annoying and can involve you having to jump through hoops to do simple things such as having an icon set that just works across all devices.

In the case of icon generation, you could manually do it with something like [Real Favicon Generator](https://realfavicongenerator.net), but if you ever change your main icon, you have to run through the entire process again. That's no fun.

Integrating manifest generation into the build pipeline makes life easier. Only minimal configuration is *required*, but if you want you can still customize to your heart's content.

## Documentation
All configuration is done in `package.json` under the `pwaManifest` (or `pwa-manifest`) key.

Almost anything that usually goes in a `manifest.json` file can go into `pwaManifest`. All parameter names have aliases in the original form from the spec (like `start_url`), in camel case (recommended, like `startUrl`), in kebab case (like `start-url`), and in other reasonable forms (like `startURL`). If you see any inconsistencies in the documentation, it's probably fine; you can use multiple names for the same value.

All parameters that exist in the [MDN documentation for the Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) are aliased, type-checked, and insterted into the manifest whenever provided in `pwaManifest`. There are a few reasonable defaults, like `'.'` for `start_url`. Watch out for two changes, though: the removal of the `icons` option to allow icon generation and the modification of the `screenshots` option's behavior (detailed below).

If you need to have a parameter not included in that list, put an array of parameter names to keep in the final manifest under the `include` key. If you use an unknown parameter name and don't put it in `include`, the generation will throw an error.

### Changes from standard manifest

The `theme_color` (aka `theme`) will default to white and will change the default behavior of some parts of the icon generation, such as the background color of the Microsoft Tile.

The `screenshots`, unlike in a normal web app manifest, should be an array of screenshot image filepaths or absolute URLs. Do not use relative URLs or they will be confused for filepaths. Each image should be a PNG, JPEG, or WebP file.

Instead of manually setting an `icons` parameter containing a set of icons, you should use `genIconOpts` (aka `iconGenerationOptions`, `iconGenOpts`, ...you get the gist). `genIconOpts` will contain the options for icon generation. The parameters for `genIconOpts` are as follows:
#### `baseIcon`
The path to the icon to generate all other icons from. Path is relative to the placement of `package.json`.
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
#### `msTileColor`
The background color for Microsoft Tiles. Defaults to the theme color.
#### `genSafariPinnedTab`
Whether or not to generate a Safari Pinned Tab SVG icon using an autotracer. Defaults to `false`
- Has a significant impact on performance (not managed by `sharp` but by native JavaScript).
- Recommended to use `genPinnedTab` or `gspt` for brevity.
#### `safariPinnedTabColor`
The color for the Safari Pinned Tab icon. Defaults to the theme color (or `'black'` if no theme was manually specified).
- Recommended to use `pinnedTabColor` or `sptc` for brevity.
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

## Advanced: Events
See the [events section for the core package](https://github.com/101arrowz/pwa-manifest/tree/master/packages/core/README.md#Advanced-Events). All events are emitted on the bundler. The only difference is that all event names are prefixed with the string `'pwa'` and there is no `'*'` (wildcard) event. Events are still camelCase, though. For example, `start` becomes `pwaStart`, `appleTouchIconGen` becomes `pwaAppleTouchIconGen`, etc.

If you have the plugin configured in `package.json`, you can do this in a custom build script:
```js
const Bundler = require('parcel-bundler');

const bundler = new Bundler('index.html');
bundler.on('pwaAppleTouchIconGen', data => {
  // Prevent filename hashing for Apple Touch Icon
  data.filename = Promise.resolve('apple-touch-icon.png');
})
```

## License
MIT