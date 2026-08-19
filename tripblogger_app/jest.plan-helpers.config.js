/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/features/trip/plan'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};
