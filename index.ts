import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, basename, sep } from 'path';
import { createHash } from 'crypto';
import { ParcelAsset } from 'parcel-bundler';
import logger from '@parcel/logger';
import sharp, { ResizeOptions } from 'sharp';

// TODO: Add Safari Pinned Tab SVG - could prove to be challenging
export = (bundler: FullBundler): void => {
  let { outDir, publicURL, contentHash, target } = bundler.options;
  if (target !== 'browser' || process.env.DISABLE_PWA_MANIFEST) {
    bundler.on('buildEnd', () => logger.warn('Manifest creation disabled'));
    return;
  }
  const hashedFilename = (filename: string, buf: Buffer): string => {
    const i = filename.lastIndexOf('.');
    const base = filename.slice(0, i);
    const ext = filename.slice(i + 1);
    return (
      base +
      '.' +
      createHash('md5')
        .update(
          contentHash
            ? ext + buf.toString()
            : '_parcel-plugin-pwa-manifest' + sep + filename
        ) // Need unique filepath :/
        .digest('hex')
        .slice(-8) +
      '.' +
      ext
    ); // Similar to (but not the same as) Parcel itself
  };
  if (!publicURL) publicURL = '/';
  else if (!publicURL.endsWith('/')) publicURL += '/';
  const getPkg = (entryAsset: ParcelAsset): Promise<PackageJSON> =>
    typeof entryAsset.getPackage === 'function'
      ? entryAsset.getPackage()
      : Promise.resolve(entryAsset.package);
  const err = (msg: string): void => {
    logger.clear();
    logger.error('Manifest creation failed! ' + msg);
  };
  bundler.on('bundled', async bundle => {
    const pkg = await getPkg(
      bundle.entryAsset || bundle.childBundles.values().next().value.entryAsset
    );
    if (!outDir) outDir = resolve(pkg.pkgdir, 'dist');

    const opts = pkg.pwaManifest || pkg['pwa-manifest'];
    if (typeof opts !== 'object') {
      if (typeof opts === 'undefined')
        return err('No PWA Manifest options found in package.json.');
      return err(
        'The PWA Manifest parameter in package.json must be an object containing the desired parameters.'
      );
    }

    const insertInto = resolve(outDir, 'index.html'); // TODO: support insertion into multiple HTML files
    if (!existsSync(insertInto))
      return err(
        'No index.html found at the root of the build. This package does not yet support this scenario.'
      );

    const name = opts.name || pkg.name;
    if (typeof name !== 'string') {
      if (typeof name === 'undefined')
        return err('No name was found in the options.');
      return err('The name provided in the options must be a string.');
    }
    const shortName =
      opts.shortName || opts['short-name'] || opts['short_name'] || name;
    if (typeof shortName !== 'string')
      return err('The short name provided in the options must be a string.');

    const desc = opts.desc || opts.description || pkg.description || '';
    if (typeof desc !== 'string')
      return err('The description provided in the options must be a string.');

    const startURL =
      opts.startUrl ||
      opts.startURL ||
      opts['start-url'] ||
      opts['start_url'] ||
      publicURL;
    if (typeof startURL !== 'string')
      return err('The start URL provided in the options must be a string.');

    const scope = opts.scope || publicURL;
    if (typeof scope !== 'string')
      return err('The scope provided in the options must be a string.');

    const theme =
      opts.theme_color ||
      opts.theme ||
      opts.themeColor ||
      opts['theme-color'] ||
      'white';
    if (typeof theme !== 'string')
      return err(
        'The theme color provided in the options must be a string representing a valid CSS color.'
      );

    logger.progress(`Generating icons for ${name}...`);

    const icons: Array<IconEntry> = [];
    const genIconOpts =
      opts.genIcon ||
      opts['gen-icon'] ||
      opts.genIconOpts ||
      opts['gen-icon-opts'] ||
      opts.genIconOptions ||
      opts['gen-icon-options'] ||
      opts.generateIcons ||
      opts['generate-icons'] ||
      opts.generateIconOptions ||
      opts['generate-icon-options'] ||
      opts.icons;
    if (typeof genIconOpts !== 'object') {
      if (typeof genIconOpts === 'undefined')
        return err(
          'No icon generation options found in the PWA manifest options.'
        );
      return err(
        'The icon generation options in the PWA manifest options must be an object containing the desired parameters.'
      );
    }

    const msTileColor: unknown =
      genIconOpts.msTileColor ||
      genIconOpts['ms-tile-color'] ||
      genIconOpts.microsoftTileColor ||
      genIconOpts['microsoft-tile-color'] ||
      theme;
    if (typeof msTileColor !== 'string')
      return err(
        'The Microsoft tile color provided in the options must be a string representing the theme color for the application.'
      );
    let browserConfig = `<TileColor>${msTileColor}</TileColor>`;
    let htmlOut = `<meta name="msapplication-config" content="${publicURL}browserconfig.xml"><meta name="theme-color" content="${theme}">`;

    const baseIconPath: unknown =
      genIconOpts.baseIcon ||
      genIconOpts['base-icon'] ||
      genIconOpts.fromIcon ||
      genIconOpts['from-icon'];
    if (typeof baseIconPath !== 'string') {
      if (typeof baseIconPath === 'undefined')
        return err('No base icon was found in the icon generation options.');
      return err(
        'The base icon parameter in the icon generation options must be a string that contains the path to the icon.'
      );
    }

    const baseIconName = basename(
      baseIconPath,
      baseIconPath.slice(baseIconPath.lastIndexOf('.'))
    );
    const baseIconFullPath = resolve(pkg.pkgdir, baseIconPath);
    if (!existsSync(baseIconFullPath))
      return err(
        'No icon was found at the base icon path ' + baseIconPath + '.'
      );

    let sizes = [96, 152, 192, 384, 512]; // Common sizes
    if (
      genIconOpts.sizes instanceof Array &&
      genIconOpts.sizes.every((v: unknown) => typeof v === 'number')
    )
      sizes = [...new Set(genIconOpts.sizes.concat(192, 512))] as number[];
    // Needed in all PWAs
    else if (typeof genIconOpts.sizes !== 'undefined')
      return err(
        'The sizes parameter in the icon generation options must be an array of numeric pixel values for sizes of the images.'
      );

    let formats: FormatOptions = {
      webp: {
        quality: 60,
        reductionEffort: 6
      },
      png: {
        compressionLevel: 9
      }
    };
    if (
      genIconOpts.formats instanceof Object &&
      Object.keys(genIconOpts.formats).every(v =>
        ['png', 'jpeg', 'webp', 'tiff'].includes(v)
      )
    )
      formats = {
        png: formats.png,
        ...genIconOpts.formats
      };
    // PNG needed in all PWAs
    else if (typeof genIconOpts.formats !== 'undefined')
      return err(
        'The formats parameter in the icon generation options must be an object with each key being a supported file type (png, webp, jpeg, or tiff) for the output images, and each value being the options to pass to sharp.'
      );

    const resizeMethod: unknown =
      genIconOpts.resizeMethod ||
      genIconOpts['resize-method'] ||
      genIconOpts.resize ||
      'cover';
    if (!['cover', 'contain', 'fill'].includes(resizeMethod as string))
      return err(
        "The resize method parameter in the icon generation options must be one of 'cover', 'contain', or 'fill'."
      );
    const resizeOptions: ResizeOptions = {
      fit: resizeMethod as 'cover' | 'contain' | 'fill',
      background: 'rgba(0, 0, 0, 0)'
    };
    const baseIcon = sharp(baseIconFullPath).ensureAlpha();
    for (const size of sizes) {
      const icon = baseIcon.clone().resize(size, size, resizeOptions);
      const saveSize = size + 'x' + size;
      for (let format of Object.keys(formats) as Array<keyof FormatOptions>) {
        // Ugly but TS is not very smart
        format = format;
        let buf;
        try {
          buf = await icon
            .clone()
            [format](formats[format])
            .toBuffer();
        } catch (e) {
          return err(
            'An unknown error ocurred during the icon creation process: ' + e
          );
        }
        const filename = hashedFilename(
          baseIconName + '-' + saveSize + '.' + format,
          buf
        );
        writeFileSync(resolve(outDir, filename), buf);

        icons.push({
          src: publicURL + filename,
          sizes: saveSize,
          type: 'image/' + format
        });
      }
    }
    logger.progress('Generating Apple Touch Icon...');
    const appleTouchIconBG: unknown =
      genIconOpts.appleTouchIconBG ||
      genIconOpts.appleTouchIconBg ||
      genIconOpts['apple-touch-icon-bg'] ||
      genIconOpts.appleTouchIconBackground ||
      genIconOpts['apple-touch-icon-background'] ||
      genIconOpts.atib ||
      theme;
    if (typeof appleTouchIconBG !== 'string')
      return err(
        'The Apple Touch Icon background color parameter must be a string representing a valid CSS color.'
      );

    const appleTouchIconPadding: unknown =
      genIconOpts.appleTouchIconPadding ||
      genIconOpts['apple-touch-icon-padding'] ||
      genIconOpts.atip ||
      12;
    if (typeof appleTouchIconPadding !== 'number')
      return err(
        'The Apple Touch Icon padding parameter must be a number of pixels to pad the image with on each side.'
      );

    let appleTouchIconBuf: Buffer;
    const atiSize = 180 - 2 * appleTouchIconPadding;
    try {
      const appleTouchIconTransparent = await baseIcon
        .clone()
        .resize(atiSize, atiSize, resizeOptions)
        .extend({
          top: appleTouchIconPadding,
          bottom: appleTouchIconPadding,
          left: appleTouchIconPadding,
          right: appleTouchIconPadding,
          background: 'rgba(0, 0, 0, 0)'
        })
        .toBuffer();
      appleTouchIconBuf = await sharp(appleTouchIconTransparent)
        .flatten({ background: appleTouchIconBG })
        .png(formats.png || {})
        .toBuffer();
    } catch (e) {
      return err(
        'An unknown error ocurred during the Apple Touch Icon creation process: ' +
          e
      );
    }
    const atiname = hashedFilename('apple-touch-icon.png', appleTouchIconBuf);
    writeFileSync(resolve(outDir, atiname), appleTouchIconBuf);
    htmlOut += `<link rel="apple-touch-icon" sizes="180x180" href="${publicURL +
      atiname}">`;
    const genFavicons: unknown =
      genIconOpts.genFavicons ||
      genIconOpts['gen-favicons'] ||
      genIconOpts.generateFavicons ||
      genIconOpts['generate-favicons'];
    if (!['boolean', 'undefined'].includes(typeof genFavicons))
      return err(
        'The favicon generation option in the icon generation options must be a boolean.'
      );
    if (genFavicons) {
      logger.progress('Generating favicons...');
      for (const size of [32, 16]) {
        let favicon: Buffer;
        try {
          favicon = await baseIcon
            .clone()
            .resize(size, size, resizeOptions)
            .png(formats.png || {})
            .toBuffer();
        } catch (e) {
          return err(
            'An unknown error ocurred during the favicon creation process: ' + e
          );
        }
        const sizes = size + 'x' + size;
        const filename = hashedFilename('favicon-' + sizes + '.png', favicon);
        writeFileSync(resolve(outDir, filename), favicon);
        htmlOut += `<link rel="icon" sizes="${sizes}" href="${publicURL +
          filename}">`;
      }
    }
    logger.progress('Generating Microsoft Tile Icons...');
    for (const size of [70, 150, 310]) {
      let msTile: Buffer;
      try {
        msTile = await baseIcon
          .clone()
          .resize(size, size, resizeOptions)
          .png(formats.png || {})
          .toBuffer();
      } catch (e) {
        return err(
          'An unknown error ocurred during the Microsoft Tile Icon creation process: ' +
            e
        );
      }
      const sizes = size + 'x' + size;
      const filename = hashedFilename('mstile-' + sizes + '.png', msTile);
      writeFileSync(resolve(outDir, filename), msTile);
      browserConfig += `<square${sizes}logo src="${publicURL + filename}"/>`;
    }
    let rectMsTile: Buffer;
    try {
      rectMsTile = await baseIcon
        .clone()
        .resize(310, 150, resizeOptions)
        .png(formats.png || {})
        .toBuffer();
    } catch (e) {
      return err(
        'An unknown error ocurred during the Microsoft Tile Icon creation process: ' +
          e
      );
    }
    const rectMsTileFilename = hashedFilename('mstile-310x150.png', rectMsTile);
    writeFileSync(resolve(outDir, rectMsTileFilename), rectMsTile);
    browserConfig += `<wide310x150logo src="${publicURL +
      rectMsTileFilename}"/>`;

    logger.progress('Generating Microsoft config...');
    writeFileSync(
      resolve(outDir, 'browserconfig.xml'),
      `<?xml version="1.0" encoding="utf-8"?><browserconfig><msapplication><tile>${browserConfig}</tile></msapplication></browserconfig>`
    );

    logger.progress('Generating manifest...');
    // No custom modifications for the rest of the common parameters, so we just do type checking
    const extraParams: PWAManifestOptions = {};
    const extraTypes: [string[], string | Verifier, unknown?][] = [
      [
        [
          'background_color',
          'backgroundColor',
          'background-color',
          'bgColor',
          'bg-color',
          'bg'
        ],
        'string',
        theme
      ],
      [
        ['categories'],
        v => v instanceof Array && v.every(el => typeof el === 'string')
      ],
      [
        ['dir', 'direction', 'textDirection', 'text-direction'],
        v => ['rtl', 'ltr', 'auto'].includes(v as string)
      ],
      [
        ['display', 'displayMode', 'display-mode'],
        v =>
          ['standalone', 'minimal-ui', 'fullscreen', 'browser'].includes(
            v as string
          ),
        'standalone'
      ],
      [
        [
          'iarc_rating_id',
          'iarc',
          'iarcId',
          'iarcID',
          'iarc-id',
          'iarcRatingId',
          'iarcRatingID',
          'iarc-rating-id',
          'iarcRating',
          'iarc-rating'
        ],
        'string'
      ],
      [['lang', 'language'], 'string'],
      [
        ['orientation', 'rotated', 'screenOrientation', 'screen-orientation'],
        v =>
          [
            'any',
            'natural',
            'landscape',
            'landscape-primary',
            'landscape-secondary',
            'portrait',
            'portrait-primary',
            'portrait-secondary'
          ].includes(v as string)
      ],
      [
        [
          'prefer_related_applications',
          'preferRelated',
          'prefer-related',
          'preferRelatedApplications',
          'prefer-related-applications'
        ],
        'boolean'
      ],
      [
        [
          'related_applications',
          'related',
          'relatedApplications',
          'related-applications'
        ],
        v =>
          v instanceof Array && v.every(el => typeof el === 'object' && el.url)
      ],
      [
        ['screenshots', 'screenShots', 'screen-shots'],
        v =>
          v instanceof Array && v.every(el => typeof el === 'object' && el.src)
      ],
      [
        ['serviceworker', 'sw', 'serviceWorker', 'service-worker'],
        v => typeof v === 'object' && !!v && v.hasOwnProperty('src')
      ]
    ];
    for (const type of extraTypes) {
      let val;
      for (const paramName of type[0]) {
        val = opts[paramName];
        if (val) break;
      }
      if (typeof val === 'undefined') {
        if (type[2])
          // Default
          extraParams[type[0][0]] = type[2];
        continue;
      }
      let checker: Verifier;
      if (typeof type[1] === 'string') checker = v => typeof v === type[1];
      else checker = type[1];
      if (!checker(val))
        return err(
          'Parameter "' +
            type[0][0] +
            '" provided in the options is invalid. Please check the official MDN documentation on the Web App Manifest.'
        );
      extraParams[type[0][0]] = val;
    }

    // When this config inevitably becomes outdated, use the include parameter to include any new parameters relevant to the Web App Manifest.
    const include: unknown =
      opts.include || opts.includeParams || opts['include-params'];
    if (include instanceof Array && include.every(v => typeof v === 'string')) {
      for (const param of include) {
        extraParams[param] = opts[param];
      }
    } else if (typeof include !== 'undefined')
      return err(
        'The include parameter in the options must be an array of extra parameter names to include in the final manifest.'
      );
    const manifest = {
      name,
      short_name: shortName,
      start_url: startURL,
      scope,
      ...(desc && { description: desc }),
      icons,
      theme_color: theme,
      ...extraParams
    };
    writeFileSync(
      resolve(outDir, 'manifest.webmanifest'),
      JSON.stringify(manifest)
    );
    htmlOut += `<link rel="manifest" href="${publicURL}manifest.webmanifest">`;
    logger.progress('Inserting links into HTML...');
    let html = readFileSync(insertInto)
      .toString()
      .replace(
        /<link rel="(manifest|icon|apple-touch-icon)"(.*?)>|<meta name="(msapplication(.*?)|theme-color)"(.*?)>/g,
        ''
      );
    const insertBefore = html.search(/(?<=<head>)|<\/head>/); // Prefer at the start, but end is acceptable too.
    if (insertBefore === -1)
      return err(
        'Could not find head tag in HTML file and therefore cannot insert necessary HTML.'
      );
    html = html.slice(0, insertBefore) + htmlOut + html.slice(insertBefore);
    writeFileSync(insertInto, html);
    logger.success('Manifest creation successful.');
  });
};