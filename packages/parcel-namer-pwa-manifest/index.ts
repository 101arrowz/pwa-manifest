import { Namer } from '@parcel/plugin';

const alreadyCreated = new Set<string>();

export default new Namer({
  async name({ bundle }) {
    const mainAsset = bundle.getMainEntry();
    if (mainAsset && mainAsset.uniqueKey.startsWith('ptpm')) {
      const fp = mainAsset.uniqueKey.slice(5);
      if (!alreadyCreated.has(fp)) {
        alreadyCreated.add(fp);
        return fp;
      }
    }
    return bundle.filePath;
  }
});
