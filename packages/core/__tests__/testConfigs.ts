import { PWAManifestOptions } from '../index';

export type BaseConfig = {
  msg: string;
  config: PWAManifestOptions;
};
export type ResultConfig = BaseConfig & {
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
    }
  },
  {
    msg: 'Specifying sizes works properly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [57, 180, 384, 512]
      }
    }
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
    }
  },
  {
    msg: 'Favicon generation works correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        genFavicons: true
      }
    }
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
    }
  },
  {
    msg: 'Microsoft Tile generation options work correctly',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        msTileColor: 'red'
      }
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
    }
  },
  {
    msg: 'Custom NODE_ENV options work',
    config: {
      test: {
        name: 'jest',
        desc: 'Ooh! testing!',
        genIconOpts: {
          baseIcon: './icon.svg',
          sizes: []
        }
      },
      shortName: 'testing',
      desc: 'a test',
      genIconOpts: {
        baseIcon: './icon.svg'
      }
    }
  },
  {
    msg: 'Purpose modification works',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        purposes: ['maskable', 'any']
      }
    }
  },
  {
    msg: 'Screenshot injection works',
    config: {
      screenshots: [
        'https://myfakesite.com/screenshot0.webp',
        './screenshot.png',
        { src: './screenshot.png', size: '123x456' }
      ],
      genIconOpts: {
        baseIcon: 'icon.svg',
        sizes: []
      }
    }
  },
  {
    msg: 'Shortcuts work',
    config: {
      shortcuts: [
        {
          name: 'Example',
          url: '/example'
        },
        {
          name: 'Complex',
          shortName: 'CX',
          url: '/complex',
          description: 'Complex config',
          icon: './icon.svg'
        }
      ],
      genIconOpts: {
        baseIcon: './icon.svg',
        shortcutSizes: []
      }
    }
  },
  {
    msg: 'Safari Pinned Tab options work',
    config: {
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: [],
        genSafariPinnedTab: true,
        sptc: 'black'
      }
    }
  },
  {
    msg: 'Standard parameters work properly',
    config: {
      name: 'My Amazing PWA',
      shortName: 'My PWA',
      startURL: './test',
      scope: '/',
      bg: 'red',
      categories: ['pwa', 'amazing'],
      dir: 'ltr',
      display: 'fullscreen',
      iarc: 'someIarcRating',
      lang: 'en',
      orientation: 'portrait-primary',
      preferRelated: true,
      related: [
        {
          platform: 'chrome_web_store',
          url:
            'https://chrome.google.com/webstore/detail/my-amazing-pwa/jlkzsdheuahoidu3idjfakj'
        },
        { platform: 'play', id: 'com.myamazingpwa.myamazingpwa' }
      ],
      theme: 'skyblue',
      genIconOpts: {
        baseIcon: './icon.svg',
        sizes: []
      }
    }
  }
];
export default testConfigs;
