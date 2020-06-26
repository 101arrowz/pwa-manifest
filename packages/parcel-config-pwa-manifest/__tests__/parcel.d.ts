interface ParcelConfig { } // TODO
declare module '@parcel/core' {
  export interface ParcelOptions {
    entries: string | string[];
    distDir: string;
    cacheDir: string;
    defaultConfig: ParcelConfig;
  }
  export default class Parcel {
    constructor(opts: ParcelOptions);
    run(): Promise<void>;
  }
}