// Pin the suite's timezone so a local run predicts CI. Vercel and the GitHub
// runner are both UTC; developers here are UTC+7, and several date paths read
// local calendar components, so an unpinned suite passes in one place and fails
// in the other. Set before the test environment initializes.
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
      },
    }],
  },
  collectCoverageFrom: [
    'src/lib/email/**/*.ts',
    '!src/lib/email/**/*.d.ts',
    '!src/lib/email/**/index.ts',
  ],
  coverageThreshold: {
    'src/lib/email/extractors/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  verbose: true,
};

module.exports = config;
