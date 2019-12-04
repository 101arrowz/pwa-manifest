module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '/__tests__/(.*).test.ts',
  collectCoverage: true,
  coverageDirectory: '__tests__/coverageReport'
}