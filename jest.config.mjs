/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testPathIgnorePatterns: ['build/', 'node_modules/', 'reports/'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'cobertura']
};
