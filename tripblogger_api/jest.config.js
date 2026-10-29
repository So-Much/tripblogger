/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          types: ['jest', 'node'],
        },
      },
    ],
    '^.+\\.m?js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          module: 'commonjs',
        },
      },
    ],
  },
  // sanitize-html 2.17 pulls ESM-only htmlparser2; Jest 29 needs it transpiled.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm/)?(sanitize-html|htmlparser2|entities|domhandler|domelementtype|domutils|nth-check|dom-serializer)(/|$))',
  ],
};
