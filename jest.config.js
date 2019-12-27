module.exports = {
  projects: [
    '<rootDir>/packages/*'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverageReport',
  moduleNameMapper: { // ts-jest prefers directly pulling in the .ts source file
    '@pwa-manifest/core': '<rootDir>/packages/core/lib/index.js',
    'parcel-plugin-pwa-manifest': '<rootDir>/packages/parcel-plugin-pwa-manifest/lib/index.js',
    'webpack-plugin-pwa-manifest': '<rootDir>/packages/webpack-plugin-pwa-manifest/lib/index.js'
  }
}