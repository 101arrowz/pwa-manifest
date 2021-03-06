module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/*.test.ts'],
  moduleNameMapper: {
    '@pwa-manifest/core': '../core',
    '@parcel/logger': 'parcel-bundler/node_modules/@parcel/logger'
  }
}