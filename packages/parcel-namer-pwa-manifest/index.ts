import { Namer } from '@parcel/plugin';

export default new Namer({
  async name({ bundle }) {
    const mainAsset = bundle.getMainEntry();
    if (mainAsset && mainAsset.uniqueKey.startsWith('ptpm-'))
      return mainAsset.uniqueKey.slice(5);
    return bundle.filePath;
  }
});
