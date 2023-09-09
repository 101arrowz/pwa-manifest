import sharp, {
  PngOptions,
  WebpOptions,
  JpegOptions,
  TiffOptions,
  ResizeOptions,
  Sharp
} from 'sharp';
import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { posterize } from '@pwa-manifest/potrace';
export type FormatOptions = {
  png: PngOptions;
  webp?: WebpOptions;
  jpeg?: JpegOptions;
  tiff?: TiffOptions;
};
export type Verifier = (v: unknown) => boolean;
export type Screenshot = {
  src: string;
  type: string;
  sizes?: string;
};
export type Shortcut = {
  name: string;
  shortName: string;
  desc: string;
  url: string;
  icon?: string | IconEntry[];
  purposes?: string[];
};
export type IconEntry = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};
// TODO: Improve
export type PWAManifestOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type MetaConfig = {
  resolveDir?: string;
  baseURL?: string;
};
export type GeneratedFiles = {
  [k: string]: Buffer;
};
// TODO: Improve
export type Manifest = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type HashFunction = (v: string) => string;
export type HashMethod = 'name' | 'content' | 'none';
export type Generation = {
  browserConfig: string;
  generatedFiles: GeneratedFiles;
  html: HTMLInsert[];
  manifest: Manifest;
};
export type EmittedGenEvent = {
  content: Promise<Buffer>;
  filename: Promise<string | undefined>;
};
export type StartEvent =
  | 'defaultIconsStart'
  | 'shortcutIconsStart'
  | 'appleTouchIconStart'
  | 'safariPinnedTabStart'
  | 'screenshotsStart'
  | 'faviconStart'
  | 'msTileStart';
export type GenerationEvent =
  | 'defaultIconsGen'
  | 'shortcutIconsGen'
  | 'appleTouchIconGen'
  | 'safariPinnedTabGen'
  | 'screenshotsGen'
  | 'faviconGen'
  | 'msTileGen';
export type EndEvent =
  | 'defaultIconsEnd'
  | 'shortcutIconsEnd'
  | 'appleTouchIconEnd'
  | 'safariPinnedTabEnd'
  | 'screenshotsEnd'
  | 'faviconEnd'
  | 'msTileEnd';
export type BaseEvent = 'start' | 'end';
export type Event = StartEvent | GenerationEvent | EndEvent | BaseEvent;
export type HTMLInsert = [string, Record<string, string>];
type AwaitableBuffer = Buffer | Promise<Buffer>;
type InternalScreenshot = {
  src: string;
  size?: string;
};
const createEvent = (
  img: AwaitableBuffer,
  filename: string
): EmittedGenEvent => ({
  filename: Promise.resolve(filename),
  content: Promise.resolve(img)
});
const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Stringifies an HTML insert. Can be used to convert each element of
 * `generator.html` to pure HTML. Not safe for custom HTML inserts.
 * @param insert The HTML insert to stringify
 * @returns The HTML string from the insert
 */
export const htmlInsertToString = (insert: HTMLInsert): string => {
  let out = '<' + insert[0];
  for (const k in insert[1]) out += ' ' + k + '="' + insert[1][k] + '"';
  return out + '>';
};

/**
 * A manifest generator and icon builder for progressive web apps
 */
export default class PWAManifestGenerator extends EventEmitter {
  /** Whether the building has been disabled. You can use this to abort disabled generation. */
  disabled: boolean; // Allow third parties to modify logging based on disabled state
  private name: string;
  private shortName: string;
  private desc: string;
  private startURL: string;
  private scope: string;
  private theme: string;
  private intBaseIconName: string;
  private intHashFunction: HashFunction = v =>
    createHash('md5')
      .update(v)
      .digest('hex');
  set hashFunction(v: HashFunction) {
    this.intHashFunction = v;
  }
  get baseIconName(): string {
    return this.intBaseIconName;
  }
  private baseIcon: Sharp;
  private sizes: number[];
  private shortcutSizes: number[];
  private purposes: string[];
  private formats: FormatOptions;
  private resizeOptions: ResizeOptions;
  private appleTouchIconBG: string;
  private appleTouchIconPadding: number;
  private doGenFavicons: boolean;
  private doGenPinnedTab: boolean;
  private pinnedTabColor: string;
  private extraParams: PWAManifestOptions;
  private defaultHashMethod: HashMethod = 'name';
  private icons: IconEntry[] = [];
  private shortcuts: Shortcut[] = [];
  private screenshots: Screenshot[] = [];
  private screenshotPaths: InternalScreenshot[] = [];
  /**
   * The hash method for the icon filename fingerprints. Can be 'none' (no
   * fingerprinting), 'name' (fingerprint based on filename), or 'content' (
   * fingerprint based on content of the file). Defaults to 'name', but using
   * 'content' is strongly encouraged. Write-only.
   */
  set hashMethod(v: HashMethod) {
    this.defaultHashMethod = v;
  }
  /** The object mapping of filename to content for each generated icon file. */
  generatedFiles: GeneratedFiles = {};
  /** The generated object that can be stringified and written to `manifest.webmanifest` */
  manifest: Manifest = {};
  /**
   * The HTML insertion values. Should all be inserted into the <head>.
   * To convert to a string, just iterate through each element and use
   * the `htmlInsertToString` function.
   */
  html: HTMLInsert[] = [];
  private intBrowserConfig: string;
  /** The generated `browserconfig.xml` string. Do not try to modify this property. */
  get browserConfig(): string {
    return `<?xml version="1.0" encoding="utf-8"?><browserconfig><msapplication><tile>${this.intBrowserConfig}</tile></msapplication></browserconfig>`;
  }
  private meta: MetaConfig;

  constructor(
    opts: PWAManifestOptions,
    { baseURL = '/', resolveDir = '.' }: MetaConfig = {},
    fallback: PWAManifestOptions = {}
  ) {
    super();
    if (!baseURL.endsWith('/')) baseURL += '/';
    this.meta = {
      baseURL,
      resolveDir
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opt = (src: any, keys: string[]): any => {
      for (const k of keys) {
        const v = src[k];
        if (typeof v !== 'undefined') return v;
      }
      if (src === opts) {
        return fallback[keys[0]];
      }
    };

    // istanbul ignore next
    if (typeof opts !== 'object') {
      if (typeof opts === 'undefined') throw 'No PWA Manifest options found.';
      throw 'The PWA Manifest options must be an object containing the desired parameters.';
    }
    const env = process.env.NODE_ENV;
    if (env && opts[env.toLowerCase()]) {
      const { [env.toLowerCase()]: envOpts, ...otherOpts } = opts;
      // istanbul ignore next
      if (typeof envOpts !== 'object') {
        throw `The specific options for environment "${env}" must be an object containing the desired parameters.`;
      }
      opts = {
        ...otherOpts,
        ...envOpts
      };
    }

    const disabled = opt(opts, ['disable', 'disabled']) || false;
    // istanbul ignore next
    if (typeof disabled !== 'boolean')
      throw 'The disable option in the PWA manifest options must be a boolean.';
    this.disabled = disabled;

    const name = opt(opts, ['name', 'appName', 'app-name']);
    // istanbul ignore next
    if (typeof name !== 'string') {
      if (typeof name === 'undefined')
        throw 'No name was found in the options.';
      throw 'The name provided in the options must be a string.';
    }
    this.name = name;

    const shortName =
      opt(opts, [
        'shortName',
        'short-name',
        'short_name',
        'appShortName',
        'app-short-name'
      ]) || name;
    // istanbul ignore next
    if (typeof shortName !== 'string')
      throw 'The short name provided in the options must be a string.';

    this.shortName = shortName;

    const desc = opt(opts, ['desc', 'description']) || '';
    // istanbul ignore next
    if (typeof desc !== 'string')
      throw 'The description provided in the options must be a string.';
    this.desc = desc;

    const startURL =
      opt(opts, ['startURL', 'startUrl', 'start-url', 'start_url']) || baseURL;
    // istanbul ignore next
    if (typeof startURL !== 'string')
      throw 'The start URL provided in the options must be a string.';
    this.startURL = startURL;

    const scope = opt(opts, ['scope']) || baseURL;
    // istanbul ignore next
    if (typeof scope !== 'string')
      throw 'The scope provided in the options must be a string.';
    this.scope = scope;

    const theme =
      opt(opts, ['themeColor', 'theme-color', 'theme_color', 'theme']) ||
      'white';
    // istanbul ignore next
    if (typeof theme !== 'string')
      throw 'The theme color provided in the options must be a string representing a valid CSS color.';
    this.theme = theme;
    const extraParams: PWAManifestOptions = {};
    const screenshots = opt(opts, ['screenshots', 'images']);
    // istanbul ignore next
    if (
      screenshots instanceof Array &&
      screenshots.every(
        v =>
          typeof v === 'string' ||
          (typeof v === 'object' &&
            v &&
            (typeof v.size === 'string' || typeof v.size === 'undefined') &&
            typeof v.src === 'string')
      )
    ) {
      const manifestScreenshots: Screenshot[] = [];
      const screenshotPaths: InternalScreenshot[] = [];
      for (const rawSC of screenshots) {
        let sc = rawSC as string;
        let sizes: string | undefined;
        if (typeof rawSC === 'object') {
          sc = rawSC.src;
          sizes = rawSC.size;
        }
        let ext = sc.slice(sc.lastIndexOf('.') + 1);
        if (ext === 'jpg') ext = 'jpeg';
        else if (!['png', 'jpeg', 'webp'].includes(ext))
          throw 'Each screenshot in the screenshots must be of type PNG, WebP, or JPEG. Ensure that the filenames have the correct extensions.';
        if (isValidURL(sc))
          manifestScreenshots.push({
            src: sc,
            type: 'image/' + ext,
            ...(sizes && { sizes })
          });
        else if (existsSync((sc = resolve(resolveDir, sc)))) {
          screenshotPaths.push({ src: sc, size: sizes });
        } else
          throw 'Every screenshot in the screenshots array must include a valid filepath or absolute URL to a screenshot image.';
      }
      this.screenshots = manifestScreenshots;
      this.screenshotPaths = screenshotPaths;
    } else if (typeof screenshots !== 'undefined')
      throw "The screenshots provided in the options must be an array of screenshot filepaths, absolute URLs, or objects with a 'src' and a 'size'.";

    const shortcuts = opt(opts, ['shortcuts', 'pages', 'links']);
    if (
      shortcuts instanceof Array &&
      shortcuts.every(v => typeof v === 'object' && v)
    ) {
      const outShortcuts: Shortcut[] = [];
      for (const shortcut of shortcuts) {
        const name = opt(shortcut, ['name']);
        if (typeof name !== 'string') {
          if (typeof name === 'undefined')
            throw 'No name was found in the shortcut options.';
          throw 'The name provided in the shortcut options must be a string.';
        }
        const shortName =
          opt(shortcut, ['shortName', 'short-name', 'short_name']) || name;
        if (typeof shortName !== 'string')
          throw 'The short name provided in the shortcut options must be a string.';
        const url = opt(shortcut, ['url', 'page', 'link']);
        if (typeof url !== 'string') {
          if (typeof url === 'undefined')
            throw 'No URL was found in the shortcut options.';
          throw 'The URL provided in the shortcut options must be a string.';
        }
        const desc = opt(shortcut, ['desc', 'description']) || '';
        if (typeof desc !== 'string')
          throw 'The description provided in the shortcut options must be a string.';
        const iconPath = opt(shortcut, ['icon']);
        let icon: string | undefined;
        if (typeof iconPath !== 'undefined') {
          if (typeof iconPath !== 'string') {
            throw 'The icon parameter in the shortcut options must be a string that contains the path to the icon.';
          }
          const iconFullPath = resolve(resolveDir, iconPath);
          if (!existsSync(iconFullPath))
            throw 'No icon was found at the path ' + iconPath + '.';
          icon = iconFullPath;
        }
        const purposes = opt(shortcut, ['purpose', 'purposes']);
        // istanbul ignore next
        if (typeof purposes !== 'undefined') {
          if (!icon) {
            throw 'The purposes parameter in the shortcut options can only exist if the shortcut has an icon.';
          }
          if (
            !(
              purposes instanceof Array &&
              purposes.every(val =>
                ['badge', 'maskable', 'monochrome', 'any'].includes(val)
              )
            )
          )
            throw "The purposes parameter in the shortcut options must be an array for which each element is one of 'badge', 'maskable', 'monochrome', or 'any'.";
        }
        outShortcuts.push({
          name,
          shortName,
          desc,
          url,
          purposes,
          icon
        });
      }
      this.shortcuts = outShortcuts;
    } else if (typeof shortcuts !== 'undefined')
      throw 'The shortcuts provided in the options must be an array of shortcut options with names, URLs, and an optional icon, short name, and description.';

    const genIconOpts = opt(opts, [
      'genIcon',
      'gen-icon',
      'iconGen',
      'icon-gen',
      'genIconOpts',
      'gen-icon-opts',
      'iconGenOpts',
      'icon-gen-opts',
      'generateIconOptions',
      'generate-icon-options',
      'iconGenerationOptions',
      'icon-generation-options',
      'icons'
    ]);
    // istanbul ignore next
    if (typeof genIconOpts !== 'object') {
      if (typeof genIconOpts === 'undefined')
        throw 'No icon generation options found in the PWA manifest options.';
      throw 'The icon generation options in the PWA manifest options must be an object containing the desired parameters.';
    }
    const msTileColor =
      opt(genIconOpts, [
        'msTileColor',
        'ms-tile-color',
        'microsoftTileColor',
        'microsoft-tile-color'
      ]) || theme;
    // istanbul ignore next
    if (typeof msTileColor !== 'string')
      throw 'The Microsoft tile color provided in the options must be a string representing the theme color for the application.';
    this.intBrowserConfig = `<TileColor>${msTileColor}</TileColor>`;
    const baseIconPath = opt(genIconOpts, [
      'baseIcon',
      'base-icon',
      'base_icon',
      'fromIcon',
      'from-icon',
      'from_icon',
      'icon'
    ]);
    // istanbul ignore next
    if (typeof baseIconPath !== 'string') {
      if (typeof baseIconPath === 'undefined')
        throw 'No base icon was found in the icon generation options.';
      throw 'The base icon parameter in the icon generation options must be a string that contains the path to the icon.';
    }

    const baseIconName = basename(
      baseIconPath,
      baseIconPath.slice(baseIconPath.lastIndexOf('.'))
    );
    const baseIconFullPath = resolve(resolveDir, baseIconPath);
    // istanbul ignore next
    if (!existsSync(baseIconFullPath))
      throw 'No icon was found at the base icon path ' + baseIconPath + '.';
    this.intBaseIconName = baseIconName;
    let sizes = [96, 152, 192, 384, 512]; // Common sizes
    const tmpSizes = opt(genIconOpts, [
      'sizes',
      'sizeList',
      'size-list',
      'size_list'
    ]);
    // istanbul ignore next
    if (
      tmpSizes instanceof Array &&
      tmpSizes.every((v: unknown) => typeof v === 'number')
    ) {
      // Needed in all PWAs
      sizes = [...new Set(tmpSizes.concat(192, 512))] as number[];
    } else if (typeof tmpSizes !== 'undefined')
      throw 'The sizes parameter in the icon generation options must be an array of numeric pixel values for sizes of the images.';
    this.sizes = sizes;

    let shortcutSizes = [96, 192];
    const tmpShortcutSizes = opt(genIconOpts, [
      'shortcutSizes',
      'shortcut-sizes',
      'shortcut_sizes',
      'shortcutSizeList',
      'shortcut-size-list',
      'shortcut_size_list'
    ]);
    // istanbul ignore next
    if (
      tmpShortcutSizes instanceof Array &&
      tmpShortcutSizes.every((v: unknown) => typeof v === 'number')
    ) {
      // Needed in all PWAs
      shortcutSizes = [...new Set(tmpShortcutSizes.concat(96))] as number[];
    } else if (typeof tmpShortcutSizes !== 'undefined')
      throw 'The shortcut sizes parameter in the icon generation options must be an array of numeric pixel values for sizes of the shortcut icons.';
    this.shortcutSizes = shortcutSizes;

    const png = {
      compressionLevel: 9
    };

    let formats: FormatOptions = {
      webp: {
        quality: 85,
        effort: 6
      },
      png
    };
    const tmpFormats = opt(genIconOpts, [
      'formats',
      'formatList',
      'format-list'
    ]);
    // istanbul ignore next
    if (
      tmpFormats instanceof Object &&
      Object.keys(tmpFormats).every(v =>
        ['png', 'jpeg', 'webp', 'tiff'].includes(v)
      )
    ) {
      formats = {
        ...tmpFormats
      };
      if (!tmpFormats.png) formats.png = png;
    }
    // PNG needed in all PWAs
    else if (typeof tmpFormats !== 'undefined')
      throw 'The formats parameter in the icon generation options must be an object with each key being a supported file type (png, webp, jpeg, or tiff) for the output images, and each value being the options to pass to sharp.';
    this.formats = formats;
    const resizeMethod =
      opt(genIconOpts, ['resizeMethod', 'resize-method', 'resize']) || 'cover';
    // istanbul ignore next
    if (!['cover', 'contain', 'fill'].includes(resizeMethod as string))
      throw "The resize method parameter in the icon generation options must be one of 'cover', 'contain', or 'fill'.";
    this.resizeOptions = {
      fit: resizeMethod as 'cover' | 'contain' | 'fill',
      background: 'rgba(0, 0, 0, 0)'
    };
    this.baseIcon = sharp(baseIconFullPath).ensureAlpha();
    const purposes = opt(genIconOpts, ['purpose', 'purposes']);
    // istanbul ignore next
    if (typeof purposes !== 'undefined')
      if (
        !(
          purposes instanceof Array &&
          purposes.every(val =>
            ['badge', 'maskable', 'monochrome', 'any'].includes(val)
          )
        )
      )
        throw "The purposes parameter in the icon generation options must be an array for which each element is one of 'badge', 'maskable', 'monochrome', or 'any'.";
    this.purposes = purposes || [];
    this.html.push([
      'meta',
      { name: 'msapplication-config', content: baseURL + 'browserconfig.xml' }
    ]);
    this.html.push(['meta', { name: 'theme-color', content: theme }]);
    const appleTouchIconBG =
      opt(genIconOpts, [
        'appleTouchIconBG',
        'appleTouchIconBg',
        'apple-touch-icon-bg',
        'appleTouchIconBackground',
        'apple-touch-icon-background',
        'atib'
      ]) || theme;
    // istanbul ignore next
    if (typeof appleTouchIconBG !== 'string')
      throw 'The Apple Touch Icon background color parameter must be a string representing a valid CSS color.';
    this.appleTouchIconBG = appleTouchIconBG;
    const appleTouchIconPadding =
      opt(genIconOpts, [
        'appleTouchIconPadding',
        'apple-touch-icon-padding',
        'atip'
      ]) ?? 12;
    // istanbul ignore next
    if (typeof appleTouchIconPadding !== 'number')
      throw 'The Apple Touch Icon padding parameter must be a number of pixels to pad the image with on each side.';
    this.appleTouchIconPadding = appleTouchIconPadding;
    const genFavicons = opt(genIconOpts, [
      'genFavicons',
      'gen-favicons',
      'generateFavicons',
      'generate-favicons'
    ]);
    // istanbul ignore next
    if (!['boolean', 'undefined'].includes(typeof genFavicons))
      throw 'The favicon generation option in the icon generation options must be a boolean.';
    this.doGenFavicons = genFavicons;
    const genPinnedTab = opt(genIconOpts, [
      'genSafariPinnedTab',
      'gen-safari-pinned-tab',
      'genPinnedTab',
      'gen-pinned-tab',
      'generateSafariPinnedTab',
      'generate-safari-pinned-tab',
      'gpt',
      'gspt'
    ]);
    // istanbul ignore next
    if (!['boolean', 'undefined'].includes(typeof genPinnedTab))
      throw 'The favicon generation option in the icon generation options must be a boolean.';
    this.doGenPinnedTab = genPinnedTab;
    const pinnedTabColor = opt(genIconOpts, [
      'safariPinnedTabColor',
      'safari-pinned-tab-color',
      'pinnedTabColor',
      'pinned-tab-color',
      'sptc'
    ]);
    // istanbul ignore next
    if (typeof pinnedTabColor !== 'string') {
      if (typeof pinnedTabColor !== 'undefined')
        throw 'The pinned tab color provided in the icon generation options must be a string representing a valid CSS color.';
    } else if (!genPinnedTab) {
      throw 'The pinned tab color cannot be specified without enabling pinned tab generation in the icon generation options.';
    }
    // Sketchy method of detecting default theme
    this.pinnedTabColor = pinnedTabColor || theme === 'white' ? 'black' : theme;

    // No custom modifications for the rest of the common parameters, so we just do type checking
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
        ['categories', 'ctgs'],
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
          v instanceof Array &&
          v.every(el => {
            if (typeof el !== 'object' || typeof el.platform !== 'string')
              return false;
            if (typeof el.id === 'string')
              return typeof el.url === 'undefined' || isValidURL(el.url);
            if (isValidURL(el.url)) return typeof el.id === 'undefined';
            return false;
          })
      ]
    ];
    for (const type of extraTypes) {
      let val;
      for (const paramName of type[0]) {
        val = opts[paramName];
        if (typeof val !== 'undefined') break;
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
      // istanbul ignore next
      if (!checker(val))
        throw 'Parameter "' +
          type[0][0] +
          '" provided in the options is invalid. Please check the official MDN documentation on the Web App Manifest.';
      extraParams[type[0][0]] = val;
    }

    // When this config inevitably becomes outdated, use the include parameter to include any new parameters relevant to the Web App Manifest.
    const include = opt(opts, ['include', 'includeParams', 'include-params']);
    // istanbul ignore next
    if (include instanceof Array && include.every(v => typeof v === 'string')) {
      for (const param of include) {
        extraParams[param] = opts[param];
      }
    } else if (typeof include !== 'undefined')
      throw 'The include parameter in the options must be an array of extra parameter names to include in the final manifest.';

    this.extraParams = extraParams;
  }

  emit(ev: StartEvent, msg: string): boolean;
  emit(ev: GenerationEvent, data: EmittedGenEvent): boolean;
  emit(ev: EndEvent): boolean;
  emit(ev: BaseEvent): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(ev: Event | '*', ...args: any[]): boolean {
    if (ev !== '*') super.emit('*', ev, ...args); // Allows attaching a listener to all events
    return super.emit(ev, ...args);
  }
  on(ev: StartEvent, listener: (msg: string) => void): this;
  on(ev: GenerationEvent, listener: (data: EmittedGenEvent) => void): this;
  on(ev: EndEvent, listener: () => void): this;
  on(ev: BaseEvent, listener: () => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(ev: '*', listener: (ev: Event, ...args: any[]) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(ev: Event | '*', listener: (...args: any[]) => void): this {
    return super.on(ev, listener);
  }

  private fingerprint(
    filename: string,
    buf: Buffer | string,
    method: HashMethod = this.defaultHashMethod
  ): string {
    const i = filename.lastIndexOf('.');
    const base = filename.slice(0, i);
    const ext = filename.slice(i + 1);
    return (
      base +
      '.' +
      (method === 'name'
        ? this.intHashFunction('_pwa-manifest-' + filename).slice(-8) + '.'
        : method === 'content'
        ? this.intHashFunction(buf.toString()).slice(-8) + '.'
        : '') +
      ext
    ); // Similar to (but not the same as) Parcel itself
  }

  /**
   * Generates the icon files, browser config, HTML, and web manifest
   * @returns The generated manifest data
   */
  async generate(): Promise<Generation> {
    if (this.disabled)
      return {
        browserConfig: '',
        generatedFiles: {},
        html: [],
        manifest: {}
      };
    this.emit('start');
    await this.genDefaultIcons();
    await this.genShortcutIcons();
    if (this.doGenFavicons) await this.genFavicons();
    if (this.doGenPinnedTab) await this.genSafariPinnedTab();
    await this.genScreenshots();
    await this.genAppleTouchIcon();
    await this.genMsTileIcons();
    await this.genManifest();
    this.emit('end');
    return {
      browserConfig: this.browserConfig,
      generatedFiles: this.generatedFiles,
      html: this.html,
      manifest: this.manifest
    };
  }

  /**
   * Generates the default icons (i.e. the ones that appear in the manifest),
   * adding them to the `generatedFiles` property.
   */
  async genDefaultIcons(): Promise<void> {
    this.emit('defaultIconsStart', `Generating icons for ${this.name}...`);
    let purpose: string | undefined;
    if (this.purposes.length) purpose = this.purposes.join(' ');
    for (const size of this.sizes) {
      const icon = this.baseIcon.clone().resize(size, size, this.resizeOptions);
      const saveSize = size + 'x' + size;
      for (const format of Object.keys(this.formats) as Array<
        keyof FormatOptions
      >) {
        let buf: AwaitableBuffer;
        try {
          buf = icon
            .clone()
            [format](this.formats[format])
            .toBuffer();
        } catch (e) {
          // istanbul ignore next
          throw 'An unknown error ocurred during the icon creation process: ' +
            e;
        }
        const fn = this.baseIconName + '-' + saveSize + '.' + format;
        const ev = createEvent(buf, fn);
        const fnProm = ev.filename;
        this.emit('defaultIconsGen', ev);
        buf = await ev.content;
        let filename = ev.filename === fnProm ? undefined : await ev.filename;
        if (!filename) filename = this.fingerprint(fn, buf);
        this.generatedFiles[filename] = buf;
        const iconEntry: IconEntry = {
          src: this.meta.baseURL + filename,
          sizes: saveSize,
          type: 'image/' + format
        };
        if (purpose) iconEntry.purpose = purpose;
        this.icons.push(iconEntry);
      }
    }
    this.emit('defaultIconsEnd');
  }

  /**
   * Generates the icons for each shortcut in the manifest, adding them to the
   * `generatedFiles` property.
   */
  async genShortcutIcons(): Promise<void> {
    this.emit('shortcutIconsStart', `Generating shortcut icons...`);
    for (let i = 0; i < this.shortcuts.length; ++i) {
      const shortcut = this.shortcuts[i];
      if (shortcut.icon) {
        const icons: IconEntry[] = [];
        const si = shortcut.icon as string;
        const shortcutIconName = basename(si, si.slice(si.lastIndexOf('.')));
        let purpose = '';
        if (shortcut.purposes) purpose = shortcut.purposes.join(' ');
        const shortcutIcon = sharp(si);
        for (const size of this.shortcutSizes) {
          const icon = shortcutIcon
            .clone()
            .resize(size, size, this.resizeOptions);
          const saveSize = size + 'x' + size;
          for (const format of Object.keys(this.formats) as Array<
            keyof FormatOptions
          >) {
            let buf: AwaitableBuffer;
            try {
              buf = icon
                .clone()
                [format](this.formats[format])
                .toBuffer();
            } catch (e) {
              // istanbul ignore next
              throw 'An unknown error ocurred during the icon creation process: ' +
                e;
            }
            const fn =
              'shortcut-' +
              shortcutIconName +
              i +
              '-' +
              saveSize +
              '.' +
              format;
            const ev = createEvent(buf, fn);
            const fnProm = ev.filename;
            this.emit('shortcutIconsGen', ev);
            buf = await ev.content;
            let filename =
              ev.filename === fnProm ? undefined : await ev.filename;
            if (!filename) filename = this.fingerprint(fn, buf);
            this.generatedFiles[filename] = buf;
            const iconEntry: IconEntry = {
              src: this.meta.baseURL + filename,
              sizes: saveSize,
              type: 'image/' + format
            };
            if (purpose) iconEntry.purpose = purpose;
            icons.push(iconEntry);
          }
        }
        shortcut.icon = icons;
      }
    }
    this.emit('shortcutIconsEnd');
  }

  /**
   * Generates the Apple Touch Icon for this config, adding it to the
   * `generatedFiles` property.
   */
  async genAppleTouchIcon(): Promise<void> {
    this.emit('appleTouchIconStart', 'Generating Apple Touch Icon...');
    let buf: AwaitableBuffer;
    const atiSize = 180 - 2 * this.appleTouchIconPadding;
    try {
      const appleTouchIconTransparent = await this.baseIcon
        .clone()
        .resize(atiSize, atiSize, this.resizeOptions)
        .extend({
          top: this.appleTouchIconPadding,
          bottom: this.appleTouchIconPadding,
          left: this.appleTouchIconPadding,
          right: this.appleTouchIconPadding,
          background: 'rgba(0, 0, 0, 0)'
        })
        .toBuffer();
      buf = sharp(appleTouchIconTransparent)
        .flatten({ background: this.appleTouchIconBG })
        .png(this.formats.png)
        .toBuffer();
    } catch (e) {
      // istanbul ignore next
      throw 'An unknown error ocurred during the Apple Touch Icon creation process: ' +
        e;
    }
    const fn = 'apple-touch-icon.png';
    const ev = createEvent(buf, fn);
    const fnProm = ev.filename;
    this.emit('appleTouchIconGen', ev);
    buf = await ev.content;
    let atiname = ev.filename === fnProm ? undefined : await ev.filename;
    if (!atiname) atiname = this.fingerprint(fn, buf);
    this.generatedFiles[atiname] = buf;
    this.html.push([
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: this.meta.baseURL + atiname
      }
    ]);
    this.emit('appleTouchIconEnd');
  }

  /**
   * Generates the screenshots for this config, adding it to the
   * `generatedFiles` property.
   */
  async genScreenshots(): Promise<void> {
    this.emit('screenshotsStart', 'Generating screenshots...');
    for (let { src, size } of this.screenshotPaths) {
      const image = sharp(src);
      if (!size) {
        const { height, width } = await image.metadata();
        size = `${width!}x${height!}`;
      }
      let buf: AwaitableBuffer = image.toBuffer();
      const fn = basename(src);
      const ev = createEvent(buf, fn);
      const fnProm = ev.filename;
      this.emit('screenshotsGen', ev);
      buf = await ev.content;
      let scName = ev.filename === fnProm ? undefined : await ev.filename;
      if (!scName) scName = this.fingerprint(fn, buf);
      this.generatedFiles[scName] = buf;
      this.screenshots.push({
        src: this.meta.baseURL + scName,
        sizes: size,
        type: 'image/' + scName.slice(scName.lastIndexOf('.') + 1)
      });
    }
    this.emit('screenshotsEnd');
  }

  /**
   * Generates the Safari Pinned Tab icon for this config, adding it to the
   * `generatedFiles` property.
   */
  async genSafariPinnedTab(): Promise<void> {
    this.emit('safariPinnedTabStart', 'Generating Safari Pinned Tab...');
    let safariPinnedTab: AwaitableBuffer;
    try {
      const { height, width } = await this.baseIcon.metadata();
      safariPinnedTab = Buffer.from(
        posterize(
          await this.baseIcon
            .clone()
            .raw()
            .toBuffer(),
          width!,
          height!
        )
      );
    } catch (e) {
      throw 'An unknown error ocurred during the Safari Pinned Tab creation process: ' +
        e;
    }
    const fn = 'safari-pinned-tab.svg';
    const ev = createEvent(safariPinnedTab, fn);
    const fnProm = ev.filename;
    this.emit('safariPinnedTabGen', ev);
    safariPinnedTab = await ev.content;
    let sptname = ev.filename === fnProm ? undefined : await ev.filename;
    if (!sptname) sptname = this.fingerprint(fn, safariPinnedTab);
    this.generatedFiles[sptname] = safariPinnedTab;
    this.html.push([
      'link',
      {
        rel: 'mask-icon',
        href: this.meta.baseURL + sptname,
        color: this.pinnedTabColor
      }
    ]);
    this.emit('safariPinnedTabEnd');
  }

  /**
   * Generates the favicons for this config, adding them to the
   * `generatedFiles` property.
   */
  async genFavicons(): Promise<void> {
    this.emit('faviconStart', 'Generating favicons...');
    for (const size of [32, 16]) {
      let favicon: AwaitableBuffer;
      try {
        favicon = this.baseIcon
          .clone()
          .resize(size, size, this.resizeOptions)
          .png(this.formats.png)
          .toBuffer();
      } catch (e) {
        // istanbul ignore next
        throw 'An unknown error ocurred during the favicon creation process: ' +
          e;
      }
      const sizes = size + 'x' + size;
      const fn = 'favicon-' + sizes + '.png';
      const ev = createEvent(favicon, fn);
      const fnProm = ev.filename;
      this.emit('faviconGen', ev);
      favicon = await ev.content;
      let filename = ev.filename === fnProm ? undefined : await ev.filename;
      if (!filename) filename = this.fingerprint(fn, favicon);
      this.generatedFiles[filename] = favicon;
      this.html.push([
        'link',
        { rel: 'icon', sizes, href: this.meta.baseURL + filename }
      ]);
    }
    this.emit('faviconEnd');
  }

  /**
   * Generates the Microsoft Tile icons for this config, adding them to the
   * `generatedFiles` property.
   */
  async genMsTileIcons(): Promise<void> {
    this.emit('msTileStart', 'Generating Microsoft Tile Icons...');
    for (const size of [70, 150, 310]) {
      let msTile: AwaitableBuffer;
      try {
        msTile = this.baseIcon
          .clone()
          .resize(size, size, this.resizeOptions)
          .png(this.formats.png)
          .toBuffer();
      } catch (e) {
        // istanbul ignore next
        throw 'An unknown error ocurred during the Microsoft Tile Icon creation process: ' +
          e;
      }
      const sizes = size + 'x' + size;
      const fn = 'mstile-' + sizes + '.png';
      const ev = createEvent(msTile, fn);
      const fnProm = ev.filename;
      this.emit('msTileGen', ev);
      msTile = await ev.content;
      let filename = ev.filename === fnProm ? undefined : await ev.filename;
      if (!filename) filename = this.fingerprint(fn, msTile);
      this.generatedFiles[filename] = msTile;
      this.intBrowserConfig += `<square${sizes}logo src="${this.meta.baseURL +
        filename}"/>`;
    }
    let rectMsTile: AwaitableBuffer;
    try {
      rectMsTile = this.baseIcon
        .clone()
        .resize(310, 150, this.resizeOptions)
        .png(this.formats.png)
        .toBuffer();
    } catch (e) {
      // istanbul ignore next
      throw 'An unknown error ocurred during the Microsoft Tile Icon creation process: ' +
        e;
    }
    const rectFn = 'mstile-310x150.png';
    const ev = createEvent(rectMsTile, rectFn);
    const rectFnProm = ev.filename;
    this.emit('msTileGen', ev);
    rectMsTile = await ev.content;
    let rectMsTileFilename =
      ev.filename === rectFnProm ? undefined : await ev.filename;
    if (!rectMsTileFilename)
      rectMsTileFilename = this.fingerprint(rectFn, rectMsTile);
    this.generatedFiles[rectMsTileFilename] = rectMsTile;
    this.intBrowserConfig += `<wide310x150logo src="${this.meta.baseURL +
      rectMsTileFilename}"/>`;
    this.emit('msTileEnd');
  }

  /**
   * Generates the manifest object for this config, setting it into the
   * `manifest` property.
   */
  async genManifest(): Promise<void> {
    this.manifest = {
      name: this.name,
      short_name: this.shortName,
      start_url: this.startURL,
      scope: this.scope,
      ...(this.desc && { description: this.desc }),
      icons: this.icons,
      theme_color: this.theme,
      ...(this.screenshots.length && { screenshots: this.screenshots }),
      ...(this.shortcuts.length && {
        shortcuts: this.shortcuts.map(shortcut => ({
          name: shortcut.name,
          short_name: shortcut.shortName,
          ...(shortcut.desc && { description: shortcut.desc }),
          url: shortcut.url,
          ...(shortcut.icon instanceof Array && { icons: shortcut.icon })
        }))
      }),
      ...this.extraParams
    };
    this.html.push([
      'link',
      { rel: 'manifest', href: this.meta.baseURL + 'manifest.webmanifest' }
    ]);
  }
}
