import { formatExchangeRateTimestamp } from '@/lib/utils/date-formatter'

describe('formatExchangeRateTimestamp', () => {
  beforeEach(() => {
    // Set a consistent date for tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-03-15T14:30:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "just now" for timestamps within a minute', () => {
    const thirtySecondsAgo = new Date('2024-03-15T14:29:30Z')
    expect(formatExchangeRateTimestamp(thirtySecondsAgo)).toBe('just now')
  })

  it('formats minutes ago correctly', () => {
    const fiveMinutesAgo = new Date('2024-03-15T14:25:00Z')
    expect(formatExchangeRateTimestamp(fiveMinutesAgo)).toBe('5 minutes ago')

    const oneMinuteAgo = new Date('2024-03-15T14:29:00Z')
    expect(formatExchangeRateTimestamp(oneMinuteAgo)).toBe('1 minute ago')
  })

  it('formats "today" with time for same day', () => {
    // Test times that are clearly more than 24 hours ago but still show time formatting
    const threeHoursAgo = new Date('2024-03-15T11:30:00Z') // 3 hours ago from test time
    const result = formatExchangeRateTimestamp(threeHoursAgo)
    expect(result).toMatch(/today, \d{1,2}:\d{2}(am|pm)/)
  })

  it('formats "yesterday" with time', () => {
    const yesterday = new Date('2024-03-14T15:20:00Z')
    const result = formatExchangeRateTimestamp(yesterday)
    expect(result).toMatch(/yesterday, \d{1,2}:\d{2}(am|pm)/)
  })

  it('formats recent days with day names', () => {
    // 3 days ago (Tuesday if today is Friday, March 15, 2024)
    const threeDaysAgo = new Date('2024-03-12T15:30:00Z')
    const result = formatExchangeRateTimestamp(threeDaysAgo)
    expect(result).toMatch(/last \w+, \d{1,2}:\d{2}(am|pm)/)
  })

  it('formats dates within current year with month and day', () => {
    const twoWeeksAgo = new Date('2024-03-01T14:15:00Z')
    expect(formatExchangeRateTimestamp(twoWeeksAgo)).toBe('Mar 1st')

    const twoMonthsAgo = new Date('2024-01-15T10:30:00Z')
    expect(formatExchangeRateTimestamp(twoMonthsAgo)).toBe('Jan 15th')

    const endOfMonth = new Date('2024-02-29T16:00:00Z') // Leap year
    expect(formatExchangeRateTimestamp(endOfMonth)).toBe('Feb 29th')
  })

  it('formats dates from previous years with year', () => {
    const lastYear = new Date('2023-12-25T12:00:00Z')
    expect(formatExchangeRateTimestamp(lastYear)).toBe('Dec 25th, 2023')

    const severalYearsAgo = new Date('2020-07-04T18:30:00Z')
    expect(formatExchangeRateTimestamp(severalYearsAgo)).toBe('Jul 4th, 2020')
  })

  it('handles ordinal suffixes correctly', () => {
    const firstOfMonth = new Date('2024-01-01T12:00:00Z')
    expect(formatExchangeRateTimestamp(firstOfMonth)).toBe('Jan 1st')

    const secondOfMonth = new Date('2024-01-02T12:00:00Z')
    expect(formatExchangeRateTimestamp(secondOfMonth)).toBe('Jan 2nd')

    const thirdOfMonth = new Date('2024-01-03T12:00:00Z')
    expect(formatExchangeRateTimestamp(thirdOfMonth)).toBe('Jan 3rd')

    const fourthOfMonth = new Date('2024-01-04T12:00:00Z')
    expect(formatExchangeRateTimestamp(fourthOfMonth)).toBe('Jan 4th')

    // Test special cases (11th, 12th, 13th should all be "th")
    const eleventhOfMonth = new Date('2024-01-11T12:00:00Z')
    expect(formatExchangeRateTimestamp(eleventhOfMonth)).toBe('Jan 11th')

    const twelfthOfMonth = new Date('2024-01-12T12:00:00Z')
    expect(formatExchangeRateTimestamp(twelfthOfMonth)).toBe('Jan 12th')

    const thirteenthOfMonth = new Date('2024-01-13T12:00:00Z')
    expect(formatExchangeRateTimestamp(thirteenthOfMonth)).toBe('Jan 13th')

    // Test 21st, 22nd, 23rd, 31st
    const twentyFirst = new Date('2024-01-21T12:00:00Z')
    expect(formatExchangeRateTimestamp(twentyFirst)).toBe('Jan 21st')

    const twentySecond = new Date('2024-01-22T12:00:00Z')
    expect(formatExchangeRateTimestamp(twentySecond)).toBe('Jan 22nd')

    const twentyThird = new Date('2024-01-23T12:00:00Z')
    expect(formatExchangeRateTimestamp(twentyThird)).toBe('Jan 23rd')

    const thirtyFirst = new Date('2024-01-31T12:00:00Z')
    expect(formatExchangeRateTimestamp(thirtyFirst)).toBe('Jan 31st')
  })

  it('accepts string dates and converts them', () => {
    const dateString = '2024-03-10T15:00:00Z' // Old enough to not trigger "minutes ago"
    const result = formatExchangeRateTimestamp(dateString)
    expect(result).toMatch(/last \w+, \d{1,2}:\d{2}(am|pm)/)
  })

  it('handles edge case time formatting', () => {
    // Test old enough time to avoid "minutes ago" logic
    const oldTime = new Date('2024-03-10T13:05:00Z')
    const result = formatExchangeRateTimestamp(oldTime)
    expect(result).toMatch(/last \w+, \d{1,2}:\d{2}(am|pm)/)
    
    // Test that minutes are properly padded (should have :05 not :5)
    expect(result).toMatch(/:0\d(am|pm)/) // Minutes ending in 5 should show :05
  })

  it('handles cross-day boundary conditions', () => {
    // Test yesterday
    const yesterday = new Date('2024-03-14T23:59:00Z')
    const result = formatExchangeRateTimestamp(yesterday)
    expect(result).toMatch(/yesterday, \d{1,2}:\d{2}(am|pm)/)
  })

  it('handles timezone-independent date comparisons', () => {
    // Test the function works with different date input types
    const dateObj = new Date('2024-03-10T12:00:00Z')
    const dateString = '2024-03-10T12:00:00Z'
    
    const result1 = formatExchangeRateTimestamp(dateObj)
    const result2 = formatExchangeRateTimestamp(dateString)
    
    expect(result1).toEqual(result2)
    expect(result1).toMatch(/last \w+, \d{1,2}:\d{2}(am|pm)/)
  })
})