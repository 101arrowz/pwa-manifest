import { Namer } from '@parcel/plugin';

export default new Namer({
  async name() {
    throw new Error(
      'parcel-namer-pwa-manifest is no longer needed. Use parcel-config-pwa-manifest v0.1.0+.'
    );
  }
});
