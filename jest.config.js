const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/types.ts',
    '!**/middleware.ts',
    '!src/lib/auth/admin-auth.ts',
    '!src/app/api/**',
    '!src/app/**/page.tsx',
    '!src/app/**/layout.tsx',
    '!src/app/**/error.tsx',
    '!src/lib/hooks/**',
    '!src/lib/services/**',
    '!src/lib/supabase/**',
    '!src/lib/utils/**',
    '!src/lib/validations/**',
  ],
  coverageReporters: ['text', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 14,
      lines: 13,
      statements: 13,
    },
  },
  testTimeout: 10000,
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase|isows|eventemitter3))'
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)