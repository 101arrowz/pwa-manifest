## 3.0.8-3.0.9
- Update dependencies, README
## 3.0.7
- Made Apple Touch Icon Padding possible to set to 0 (fix #13)
## 3.0.3-3.0.6
- Removed `pwaBuildStart` and `pwaBuildEnd` events, since they are no longer useful
- Improved documentation
# 3.0.0-3.0.2
- Now automatically inserts links into every HTML file
- Speed dramatically improved (begin at build start rather than end)
  - Could see zero impact on performance, unlike ANY other Parcel plugin out there
- Images are included in final logs
- Fixed bugs
## 2.9.3
- Removed deprecated `serviceworker` option support; added screenshot resolution
## 2.9.2
- Added purpose support
## 2.6.0-2.9.1
- Added `disabled` and custom `NODE_ENV` options
- Boosted rank
## 2.5.11-2.5.13
- Boosted rank
## 2.5.9-2.5.10
- Improved README
## 2.5.8
- Fixed tests (should not have been a version change)
- Finished adding all tests
## 2.5.7
- Overhauled testing mechanism
- Added coverage report
## 2.5.6
- Minor improvements
## 2.5.5
- Added badge, license
## 2.5.4
- Add tests
  - Hopefully no more broken versions
## 2.5.3
- Respect public URL provided (broken before)
## 2.5.2
- Switched to ambient type declarations (should not have updated version)
## 2.5.1
- Fixed 2.5.0 bugs
## 2.4.0-2.5.0
- Added support for multiple entry ports
- Deprecated because broken
## 2.3.0
- Minor bugfixes (should have been 2.2.2)
## 2.2.1
- Used `unknown` instead of implicity `any` type
## 2.2.0
- Migrated to TypeScript
- Minor bugfixes
## 2.1.1-2.1.5
- Fixed buggy, failing code
## 2.1.0
- Added Wide MS Tile support
- Added `resizeMethod` option
- Fixed theme color issues
- Updated Parcel minimum version
## 2.0.3
- Respect `contentHash` Parcel option
- Update README with better format
## 2.0.2
- Fixed README format
## 2.0.1
- Created README with documentation
# 2.0.0
- Now an actual PWA manifest generator, rather than [what it was before](https://github.com/101arrowz/parcel-plugin-precache-manifest)