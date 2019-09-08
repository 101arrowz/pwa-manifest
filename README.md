# parcel-plugin-pwa-manifest
A simple Parcel plugin that generates a PWA manifest that can be imported by service workers

## Usage

File: `service-worker.js`

```javascript
importScripts('/pwa-manifest.js'); // URL depends on publicUrl param given to Parcel

self.addEventListener('install', e => {
  // Variable filesToCache added to global scope of service worker in pwa-manifest.js
  e.waitUntil(() => caches.open('v1').then(cache => cache.addAll(filesToCache)));
})
// Variable name and URL can be customized in package.json
```

File: `package.json`

```json
{
  "pwa-manifest": {
    "filename": "different-filename.js",
    "variableName": "customVariableName"
  }
}
```


