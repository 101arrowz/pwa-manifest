# parcel-plugin-pwa-manifest
A simple Parcel plugin that generates a PWA manifest that can be imported by service workers

## Usage

The filename defaults to `pwa-manifest.js` and the variable name defaults to `filesToCache`. However, you can customize this in `package.json`.

In `service-worker.js`:

```javascript
importScripts('/myFilename.js'); // path depends on publicUrl param given to Parcel 

self.addEventListener("install", e => {
  // Array containing URLs of everything in the bundle is added to global scope of service worker in pwa-manifest.js
  e.waitUntil(() =>
    caches.open("v1").then(cache => cache.addAll(myVariableName))
  );
});
```

In `package.json`:

```json
{
  "pwaManifest": {
    "filename": "myFilename.js",
    "variableName": "myVariableName"
  }
}
```

If you're want to completely guarantee that you don't use an old version of the manifest when updating your service worker, you can't (yet) use `importScripts`. However, you can set the option `asJSON` to `true` in `package.json` and make a `fetch` call instead. This has the added benefit of not adding an extra variable to the global scope. `asJSON` changes the default filename to `pwa-manifest.json`, and the `variableName` parameter becomes ignored.

In `service-worker.js`:

```javascript
self.addEventListener("install", e => {
  e.waitUntil(() =>
    caches.open("v1").then(cache =>
      fetch("/pwa-manifest.json", { cache: "no-store" })
        .then(res => res.json())
        .then(filesToCache => cache.addAll(filesToCache))
    )
  );
});
```

In `package.json`:
```json
{
  "pwaManifest": {
    "asJSON": true
  }
}
```

## License
MIT