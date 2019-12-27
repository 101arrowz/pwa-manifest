module.exports = {
  preset: 'ts-jest',
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
  globals: {
    'ts-jest': {
      tsConfig: "tsconfig.json"
    }
  },
  collectCoverage: true,
  coverageDirectory: 'coverageReport',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@pwa-manifest/core': '<rootDir>/packages/core/lib'
  }
}