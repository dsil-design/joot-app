import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock window.location
delete window.location
window.location = { href: '' }

// Mock performance.now for performance tests
global.performance = {
  now: jest.fn(() => Date.now()),
}
