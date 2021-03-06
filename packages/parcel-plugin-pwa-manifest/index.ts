import PWAManifestGenerator from '@pwa-manifest/core';
import posthtml from 'posthtml';
import logger from '@parcel/logger';
import { resolve, dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { CorrectedParcelBundle } from './types';
import { Asset } from 'parcel-bundler';
class PWAManifestAsset extends Asset {
  hash: string;
  generated: { raw: Buffer | string };
  constructor(
    private srcName: string,
    [fakePath, rootDir]: [string, string],
    outDir: string,
    private trueContents: Buffer | string
  ) {
    super(fakePath, {
      outDir,
      rootDir
    });
    const noExt = srcName.slice(0, srcName.lastIndexOf('.'));
    this.hash = noExt.slice(noExt.lastIndexOf('.'));
    this.type = 'raw';
    this.generated = {
      raw: trueContents
    };
  }
  generateBundleName(): string {
    return this.srcName;
  }
  async load(): Promise<Buffer> {
    return this.trueContents instanceof Buffer
      ? this.trueContents
      : Buffer.from(this.trueContents);
  }
}

export = (bundler: FullBundler): void => {
  let { outDir, publicURL, contentHash, target } = bundler.options;
  // istanbul ignore next
  if (target !== 'browser') {
    bundler.on('buildEnd', () =>
      logger.warn("Manifest creation disabled: target is not 'browser'")
    );
    return;
  }
  // istanbul ignore next
  if (!publicURL) publicURL = '/';
  else if (!publicURL.endsWith('/')) publicURL += '/';
  bundler.on('buildStart', entryFiles => {
    try {
      let pkgDir = resolve(dirname(entryFiles[0]));
      // If root directory, dirname(pkgDir) === pkgDir
      while (!existsSync(join(pkgDir, 'package.json'))) {
        // istanbul ignore next
        if (pkgDir === (pkgDir = dirname(pkgDir)))
          throw 'No package.json found.';
      }
      const pkg = JSON.parse(
        readFileSync(join(pkgDir, 'package.json')).toString()
      );
      const opts = pkg.pwaManifest || pkg['pwa-manifest'];
      // istanbul ignore next
      if (typeof opts !== 'object') {
        if (typeof opts === 'undefined')
          throw 'No PWA Manifest options found in package.json.';
        throw 'The PWA Manifest parameter in package.json must be an object containing the desired parameters.';
      }
      const generator = new PWAManifestGenerator(
        opts,
        {
          baseURL: publicURL,
          resolveDir: pkgDir
        },
        {
          name: pkg.name,
          desc: pkg.description
        }
      );
      if (generator.disabled) return;
      generator.on('*', (ev, ...args) => {
        bundler.emit(
          `pwa${ev.slice(0, 1).toUpperCase() + ev.slice(1)}`,
          ...args
        );
        if (ev.endsWith('Start')) {
          setTimeout(() => logger.progress(args[0]), 0);
        }
      });
      if (contentHash) generator.hashMethod = 'content';
      const createBundleTree = bundler.createBundleTree;
      const generationPromise = generator.generate();
      // Parcel, why can't you play nice?!
      bundler.createBundleTree = (arg0, bundle, ...args) => {
        bundler.createBundleTree = createBundleTree;
        bundler.createBundleTree(arg0, bundle, ...args);
        const bundlerPatch = generationPromise.then(
          ({ html: pwaManifestInjection }) => {
            const HTMLPackager = bundler.packagers.get(
              'html'
            ) as typeof Packager;
            class PWAManifestHTMLPackager extends HTMLPackager {
              injectedPWAManifest = false;
              async addAsset(asset: Asset): Promise<void> {
                // Copied mostly from Parcel source code
                let html = (asset.generated.html as string) || '';
                const siblingBundles = Array.from(this.bundle.childBundles)
                  .reduce(
                    (p, b) => p.concat([...b.siblingBundles.values()]),
                    []
                  )
                  .filter((b: Asset) => b.type === 'css' || b.type === 'js');
                html = ((posthtml([
                  tree => {
                    if (this.injectedPWAManifest) return;
                    this.injectedPWAManifest = true;
                    tree.match({ tag: 'head' }, node => {
                      node.content!.push(
                        ...pwaManifestInjection.map(([tag, attrs]) => {
                          return ({
                            tag,
                            attrs
                          } as unknown) as string; // suppress stupid TypeScript errors
                        })
                      );
                      return node;
                    });
                  },
                  this.insertSiblingBundles.bind(this, siblingBundles)
                ]).process(html, { sync: true }) as unknown) as {
                  html: string;
                }).html;
                await this.write(html);
              }
            }
            bundler.packagers.add('html', PWAManifestHTMLPackager);
          }
        );
        let addedAssets = false;
        const {
          name: fakePath,
          options: { rootDir }
        } = (bundle.entryAsset
          ? bundle
          : ((bundle.childBundles.values().next()
              .value as unknown) as CorrectedParcelBundle)
        ).entryAsset;
        const modBundle = (localBundle: CorrectedParcelBundle): void => {
          const _package = localBundle._package;
          const packageFn = localBundle.package;
          localBundle.package = async (...args) => {
            const {
              manifest,
              browserConfig,
              generatedFiles
            } = await generationPromise;
            if (!addedAssets) {
              addedAssets = true;
              localBundle.createChildBundle(
                new PWAManifestAsset(
                  'manifest.webmanifest',
                  [fakePath, rootDir],
                  outDir,
                  JSON.stringify(manifest)
                )
              );
              localBundle.createChildBundle(
                new PWAManifestAsset(
                  'browserconfig.xml',
                  [fakePath, rootDir],
                  outDir,
                  browserConfig
                )
              );
              for (const file in generatedFiles)
                localBundle.createChildBundle(
                  new PWAManifestAsset(
                    file,
                    [fakePath, rootDir],
                    outDir,
                    generatedFiles[file]
                  )
                );
              logger.success('Manifest creation successful.');
            }
            localBundle.package = packageFn;
            return await localBundle.package(...args);
          };
          localBundle._package = async () => {
            await bundlerPatch;
            localBundle._package = _package;
            await localBundle._package(bundler);
          };
          for (const childBundle of localBundle.childBundles.values())
            modBundle(childBundle);
        };
        modBundle(bundle);
      };
    } catch (msg) /* istanbul ignore next */ {
      logger.clear();
      logger.error('Manifest creation failed! ' + msg);
    }
  });
};
