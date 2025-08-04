import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockPrefetch = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
  },
  writable: true
})

// Mock performance.now for performance tests
global.performance = {
  now: jest.fn(() => Date.now()),
}

// Supabase client will be mocked individually in each test file as needed

// Global test setup
beforeEach(() => {
  mockPush.mockClear()
  mockReplace.mockClear()
  mockPrefetch.mockClear()
})

// Suppress console.log during tests unless explicitly needed
const originalConsoleLog = console.log
beforeEach(() => {
  console.log = jest.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
})
