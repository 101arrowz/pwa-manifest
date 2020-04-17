declare module 'parcel-bundler' {
  export class Asset {
    constructor(name: string, options: object);
    generated: Record<string, unknown>;
    type: string;
    name: string;
    options: { rootDir: string };
  }
}
export {};
