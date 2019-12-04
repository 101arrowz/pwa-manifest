export type BaseConfig = {
  msg: string;
  config: PWAManifestOptions;
};
export type ResultConfig = BaseConfig & {
  result: string[];
  manifest?: unknown;
  browserconfig?: string;
  html?: string;
  logOutput?: boolean;
};
export type ErrorConfig = BaseConfig & {
  throws: string;
};
export type Config = ResultConfig | ErrorConfig;
// All these do is check filenames. This works because we use content hashing,
// so we can verify the contents with just the filename. Smart, right?
const testConfigs: Config[] = [
  {
    msg: 'Default generation works correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg'
      }
    },
    result: [
      'apple-touch-icon.105de2c5.png',
      'icon-152x152.c0cccc53.webp',
      'icon-152x152.c5e4d8cb.png',
      'icon-192x192.3103561d.webp',
      'icon-192x192.cab29cd7.png',
      'icon-384x384.2b65be8b.png',
      'icon-384x384.a54ab4a2.webp',
      'icon-512x512.5c88cabb.webp',
      'icon-512x512.b24e0d51.png',
      'icon-96x96.00714ae7.webp',
      'icon-96x96.b73322f2.png',
      'mstile-150x150.df894f37.png',
      'mstile-310x150.23817a3d.png',
      'mstile-310x310.5f619e76.png',
      'mstile-70x70.3bcf1bff.png'
    ],
    manifest: {
      name: 'tester',
      short_name: 'tester',
      start_url: './',
      scope: './',
      description: 'test',
      theme_color: 'white',
      background_color: 'white',
      display: 'standalone'
    },
    html:
      '<meta name="msapplication-config" content="./browserconfig.xml"><meta name="theme-color" content="white"><link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.105de2c5.png"><link rel="manifest" href="./manifest.webmanifest">',
    browserconfig:
      '<TileColor>white</TileColor><square70x70logo src="./mstile-70x70.3bcf1bff.png"/><square150x150logo src="./mstile-150x150.df894f37.png"/><square310x310logo src="./mstile-310x310.5f619e76.png"/><wide310x150logo src="./mstile-310x150.23817a3d.png"/>'
  },
  {
    msg: 'Specifying sizes works properly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [57, 180, 384, 512]
      }
    },
    result: [
      'icon-180x180.11d6a1b0.png',
      'icon-180x180.8679c686.webp',
      'icon-192x192.3103561d.webp',
      'icon-192x192.cab29cd7.png',
      'icon-384x384.2b65be8b.png',
      'icon-384x384.a54ab4a2.webp',
      'icon-512x512.5c88cabb.webp',
      'icon-512x512.b24e0d51.png',
      'icon-57x57.9f45d850.webp',
      'icon-57x57.b6c9c126.png'
    ]
  },
  {
    msg: 'Favicon generation works correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        genFavicons: true
      }
    },
    result: ['favicon-16x16.726e3e17.png', 'favicon-32x32.6326f01e.png']
  },
  {
    msg: 'Formats work correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        formats: {
          webp: {
            quality: 20,
            nearLossLess: true,
            reductionEffort: 2
          },
          png: {},
          jpeg: {}
        }
      }
    },
    result: [
      'icon-192x192.c200a912.webp',
      'icon-192x192.cab29cd7.png',
      'icon-192x192.d000ffb1.jpeg',
      'icon-512x512.7905353f.webp',
      'icon-512x512.b24e0d51.png',
      'icon-512x512.be19cd61.jpeg'
    ]
  },
  {
    msg: 'Apple Touch Icon generation options work correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        atib: 'red',
        appleTouchIconPadding: 40
      }
    },
    result: ['apple-touch-icon.da66403e.png']
  },
  {
    msg: 'Microsoft Tile generation options work correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        msTileColor: 'red'
      }
    },
    result: [],
    browserconfig: '<TileColor>red</TileColor>'
  },
  {
    msg: 'Theme color works correctly and propogates properly',
    config: {
      theme: 'skyblue',
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: []
      }
    },
    result: ['apple-touch-icon.9f32030a.png'],
    manifest: {
      theme_color: 'skyblue',
      background_color: 'skyblue'
    }
  },
  {
    msg: 'Resize method option works correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        resizeMethod: 'contain'
      }
    },
    result: [
      'apple-touch-icon.8fc5a4a3.png',
      'icon-192x192.26ee10ad.png',
      'icon-192x192.ea35d5ea.webp',
      'icon-512x512.0acebfc0.webp',
      'icon-512x512.8a965e44.png',
      'mstile-150x150.73e6888b.png',
      'mstile-310x150.b2a9aefd.png',
      'mstile-310x310.37da2c84.png',
      'mstile-70x70.a0b5039e.png'
    ]
  },
  {
    msg:
      'Valid properties are inserted and aliased; unknown properties are removed',
    config: {
      textDirection: 'rtl',
      categories: ['a', 'test'],
      iarc: 'someString',
      screenOrientation: 'natural',
      displayMode: 'standalone',
      relatedApplications: [
        {
          url: '/aRelatedApp'
        }
      ],
      screenShots: [
        {
          src: './sc1.png'
        }
      ],
      sw: {
        src: './sw.js'
      },
      unknownPropertyName: 123,
      otherUnknownPropertyName: 456,
      include: ['unknownPropertyName'],
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: []
      }
    },
    result: [],
    manifest: {
      dir: 'rtl',
      categories: ['a', 'test'],
      iarc_rating_id: 'someString',
      orientation: 'natural',
      screenshots: [
        {
          src: './sc1.png'
        }
      ],
      serviceworker: {
        src: './sw.js'
      },
      unknownPropertyName: 123
    }
  },
  {
    msg: 'Config overrides package.json properties',
    config: {
      name: 'Tester',
      shortName: 'Test',
      desc: 'Better test!',
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: []
      }
    },
    result: [],
    manifest: {
      name: 'Tester',
      short_name: 'Test',
      description: 'Better test!'
    }
  }
];
export default testConfigs;
