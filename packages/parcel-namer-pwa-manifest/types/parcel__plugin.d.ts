type Asset = {
  uniqueKey: string;
}

type Bundle = {
  filePath: string;
  getMainEntry(): Asset;
}

declare module '@parcel/plugin' {
  export class Namer {
    constructor(data: {
      name(dat: { bundle: Bundle }): Promise<string>
    });
  }
}