module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/*.test.ts'],
  moduleNameMapper: {
    'weak-lru-cache': 'weak-lru-cache/dist/index.cjs',
    'ordered-binary': 'ordered-binary/dist/index.cjs'
  }
}