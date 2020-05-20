module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/*.test.ts'],
  coveragePathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/potrace"]
}