module.exports = {
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/__tests__/*.test.ts']
    },
    {
      preset: 'ts-jest',
      displayName: 'parcel-plugin-pwa-manifest',
      testMatch: ['<rootDir>/packages/parcel-plugin-pwa-manifest/__tests__/*.test.ts']
    },
    {
      preset: 'ts-jest',
      displayName: 'webpack-plugin-pwa-manifest',
      testMatch: ['<rootDir>/packages/webpack-plugin-pwa-manifest/__tests__/*.test.ts']
    }
  ],
  collectCoverage: true,
  coverageDirectory: 'coverageReport',
  testEnvironment: 'node',
}