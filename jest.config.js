module.exports = {
  preset: 'ts-jest',
  projects: [
    '<rootDir>/packages/*/jest.config.js'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverageReport',
  testEnvironment: 'node',
}