# parcel-plugin-pwa-manifest

A Parcel plugin that generates a Web App Manifest, creates all the icons you need, and more!

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

## Are there any limitations?
Yes. As of now, the plugin only supports applications that have a single HTML file, `index.html`, at their root paths. That should be almost all of them, but if you need the manifest served at multiple HTML files, you're out of luck. (If anyone needs this, you can make an issue and provide your use case.)

Safari pinned tab support would also require an autotracer to get an SVG output, which is too large an addition for a small plugin like this. If you absolutely need pinned tab support, you have to manually insert it into the original HTML file.

## Documentation
All configuration is done in `package.json` under the `pwaManifest` key.

Anything that usually goes in a `manifest.json` file besides `icons` can go into `pwaManifest`. All parameter names have aliases (e.g. `start_url` can also be `startURL`, `startUrl`, or `start-url`). If you see any inconsistencies in the documentation, it's probably fine; you can use multiple names for the same value.

### Changes from standard manifest
The `name` and `description` will default to their counterparts in the outer layer of `package.json`.

The `theme_color` will default to white and will change the default behavior of some parts of the icon generation, such as the background color of the Microsoft Tile.

Instead of manually setting an `icons` parameter containing a set of icons, you should use `genIconOpts`, which will contain the options for icon generation. The parameters for `genIconOpts` are as follows:
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
#### `appleTouchIconPadding`
The number of pixels to pad the Apple Touch Icon with on all sides. Defaults to 12.
- Used to account for Apple's courner-rounding.
#### `genFavicons`
Whether or not to generate 16x16 and 32x32 favicons and insert links in the HTML. Defaults to `false`.
#### `msTileColor`
The background color for Microsoft Tiles. Defaults to the theme color.
#### `resizeMethod`
The method to use for resizing non-square images. Can be one of `'cover'` (default), `'contain'`, or `'fill'`.
#### `disabled`
Disables the manifest creation with no warning.
- Used to speed up builds when icon generation isn't needed (i.e. when developing with HMR)
#### `production` / `development`
The parameters to use when `NODE_ENV` is a certain value. Merged with the outer parameters.
- Useful for disabling/generating less icons in development
- Case-insensitive - use lowercase in options
- Can be anything. `production` and `development` are common, but you could hypothetically set your `NODE_ENV` to `asdf` and have an `asdf` key with custom manifest generation options
---

All parameters that exist in the [MDN documentation for the Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) are aliased, type-checked, and insterted into the manifest whenever provided in `pwaManifest`. There are a few reasonable defaults, like `'.'` for `start_url`. 

If you need to have a parameter not included in that list, put an array of parameter names to keep in the final manifest under the `include` key.

## Known Issues
- JPEG output has a black background by default. There's nothing I can do about this other than add a new option for background color because JPEG does not support transparency.
  - I suggest that you don't output JPEG at all, I only offer it for those who may need it. 

## License
MIT