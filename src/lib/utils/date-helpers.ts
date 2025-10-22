/**
 * Date utility functions for exchange rate processing
 * Handles business day calculations, date validation, and timezone considerations
 */

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface BusinessDayOptions {
  includeWeekends?: boolean;
  holidays?: string[]; // Array of YYYY-MM-DD holiday dates to exclude
}

export const dateHelpers = {
  /**
   * Generate business days between two dates (excluding weekends)
   * @param startDate YYYY-MM-DD format
   * @param endDate YYYY-MM-DD format
   * @param options Optional configuration for weekends and holidays
   * @returns Array of date strings in YYYY-MM-DD format
   */
  getBusinessDays: (
    startDate: string, 
    endDate: string, 
    options: BusinessDayOptions = {}
  ): string[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const { includeWeekends = false, holidays = [] } = options;
    
    if (start > end) {
      throw new Error('Start date must be before or equal to end date');
    }
    
    const businessDays: string[] = [];
    const current = new Date(start);
    const holidaySet = new Set(holidays);
    
    while (current <= end) {
      const dateString = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      
      // Check if it's a weekend
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Include date if:
      // - Not a weekend, OR weekends are included
      // - Not a holiday
      if ((!isWeekend || includeWeekends) && !holidaySet.has(dateString)) {
        businessDays.push(dateString);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return businessDays;
  },

  /**
   * Check if a date is a business day (Monday-Friday, excluding holidays)
   * @param date YYYY-MM-DD format
   * @param holidays Optional array of holiday dates to exclude
   * @returns true if the date is a business day
   */
  isBusinessDay: (date: string, holidays: string[] = []): boolean => {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    // Check if weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if holiday
    if (holidays.includes(date)) {
      return false;
    }
    
    return true;
  },

  /**
   * Get the previous business day from a given date
   * @param date YYYY-MM-DD format
   * @param holidays Optional array of holiday dates to exclude
   * @returns Previous business day in YYYY-MM-DD format
   */
  getPreviousBusinessDay: (date: string, holidays: string[] = []): string => {
    const current = new Date(date);
    
    do {
      current.setDate(current.getDate() - 1);
    } while (!dateHelpers.isBusinessDay(current.toISOString().split('T')[0], holidays));
    
    return current.toISOString().split('T')[0];
  },

  /**
   * Get the next business day from a given date
   * @param date YYYY-MM-DD format
   * @param holidays Optional array of holiday dates to exclude
   * @returns Next business day in YYYY-MM-DD format
   */
  getNextBusinessDay: (date: string, holidays: string[] = []): string => {
    const current = new Date(date);
    
    do {
      current.setDate(current.getDate() + 1);
    } while (!dateHelpers.isBusinessDay(current.toISOString().split('T')[0], holidays));
    
    return current.toISOString().split('T')[0];
  },

  /**
   * Subtract a number of business days from a date
   * @param date Starting date (Date object or YYYY-MM-DD string)
   * @param days Number of business days to subtract
   * @param holidays Optional array of holiday dates to exclude
   * @returns Date string in YYYY-MM-DD format
   */
  subtractBusinessDays: (date: Date | string, days: number, holidays: string[] = []): string => {
    const current = typeof date === 'string' ? new Date(date) : new Date(date);
    let businessDaysSubtracted = 0;
    
    while (businessDaysSubtracted < days) {
      current.setDate(current.getDate() - 1);
      const dateString = current.toISOString().split('T')[0];
      
      if (dateHelpers.isBusinessDay(dateString, holidays)) {
        businessDaysSubtracted++;
      }
    }
    
    return current.toISOString().split('T')[0];
  },

  /**
   * Add a number of business days to a date
   * @param date Starting date (Date object or YYYY-MM-DD string)
   * @param days Number of business days to add
   * @param holidays Optional array of holiday dates to exclude
   * @returns Date string in YYYY-MM-DD format
   */
  addBusinessDays: (date: Date | string, days: number, holidays: string[] = []): string => {
    const current = typeof date === 'string' ? new Date(date) : new Date(date);
    let businessDaysAdded = 0;
    
    while (businessDaysAdded < days) {
      current.setDate(current.getDate() + 1);
      const dateString = current.toISOString().split('T')[0];
      
      if (dateHelpers.isBusinessDay(dateString, holidays)) {
        businessDaysAdded++;
      }
    }
    
    return current.toISOString().split('T')[0];
  },

  /**
   * Get the target sync date based on current day
   * For daily sync: attempts to get today's rates if it's a business day
   * Falls back to previous business day if today is a weekend/holiday
   *
   * Note: ECB typically publishes rates around 14:00-15:00 UTC on business days
   * Our cron runs at 18:00 UTC, providing a 3-4 hour buffer
   *
   * @param currentDate Optional current date (defaults to today)
   * @param holidays Optional array of holiday dates to exclude
   * @returns Target date for sync in YYYY-MM-DD format
   */
  getTargetSyncDate: (currentDate?: Date, holidays: string[] = []): string => {
    const today = currentDate || new Date();
    const todayString = today.toISOString().split('T')[0];

    // If today is a business day, sync today's data
    if (dateHelpers.isBusinessDay(todayString, holidays)) {
      return todayString;
    }

    // Otherwise, get the most recent business day
    return dateHelpers.getPreviousBusinessDay(todayString, holidays);
  },

  /**
   * Validate date range
   * @param startDate YYYY-MM-DD format
   * @param endDate YYYY-MM-DD format
   * @returns true if the date range is valid
   */
  validateDateRange: (startDate: string, endDate: string): boolean => {
    if (!dateHelpers.isValidDateString(startDate) || !dateHelpers.isValidDateString(endDate)) {
      return false;
    }
    
    return new Date(startDate) <= new Date(endDate);
  },

  /**
   * Validate date string format (YYYY-MM-DD)
   * @param dateString Date string to validate
   * @returns true if the date string is valid
   */
  isValidDateString: (dateString: string): boolean => {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0] === dateString;
  },

  /**
   * Get the previous day (not necessarily business day)
   * @param date YYYY-MM-DD format
   * @param daysBack Number of days to go back (default: 1)
   * @returns Previous day in YYYY-MM-DD format
   */
  getPreviousDay: (date: string, daysBack: number = 1): string => {
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() - daysBack);
    return dateObj.toISOString().split('T')[0];
  },

  /**
   * Get the start and end of a month
   * @param year Full year (e.g., 2024)
   * @param month Month (1-12)
   * @returns Object with startDate and endDate
   */
  getMonthRange: (year: number, month: number): DateRange => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  },

  /**
   * Get the start and end of a year
   * @param year Full year (e.g., 2024)
   * @returns Object with startDate and endDate
   */
  getYearRange: (year: number): DateRange => {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  },

  /**
   * Calculate the number of business days between two dates
   * @param startDate YYYY-MM-DD format
   * @param endDate YYYY-MM-DD format
   * @param holidays Optional array of holiday dates to exclude
   * @returns Number of business days between the dates
   */
  getBusinessDayCount: (startDate: string, endDate: string, holidays: string[] = []): number => {
    const businessDays = dateHelpers.getBusinessDays(startDate, endDate, { holidays });
    return businessDays.length;
  },

  /**
   * Format date for display
   * @param date Date string in YYYY-MM-DD format
   * @param format Optional format ('short', 'long', 'iso')
   * @returns Formatted date string
   */
  formatDate: (date: string, format: 'short' | 'long' | 'iso' = 'short'): string => {
    const dateObj = new Date(date);
    
    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'iso':
        return dateObj.toISOString();
      case 'short':
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  },

  /**
   * Get current UTC date in YYYY-MM-DD format
   * @returns Current UTC date string
   */
  getCurrentUTCDate: (): string => {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Get yesterday's date in YYYY-MM-DD format
   * @returns Yesterday's date string
   */
  getYesterday: (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  },

  /**
   * Check if a date is in the future
   * @param date YYYY-MM-DD format
   * @returns true if the date is in the future
   */
  isFutureDate: (date: string): boolean => {
    const today = dateHelpers.getCurrentUTCDate();
    return date > today;
  },

  /**
   * Check if a date is today
   * @param date YYYY-MM-DD format
   * @returns true if the date is today
   */
  isToday: (date: string): boolean => {
    const today = dateHelpers.getCurrentUTCDate();
    return date === today;
  },

  /**
   * Find missing dates in a date range
   * @param existingDates Array of existing dates in YYYY-MM-DD format
   * @param startDate Start of range to check
   * @param endDate End of range to check
   * @param businessDaysOnly Only check business days
   * @param holidays Optional array of holiday dates
   * @returns Array of missing dates
   */
  findMissingDates: (
    existingDates: string[],
    startDate: string,
    endDate: string,
    businessDaysOnly: boolean = true,
    holidays: string[] = []
  ): string[] => {
    const existingSet = new Set(existingDates);
    const expectedDates = businessDaysOnly 
      ? dateHelpers.getBusinessDays(startDate, endDate, { holidays })
      : dateHelpers.getBusinessDays(startDate, endDate, { includeWeekends: true, holidays });
    
    return expectedDates.filter(date => !existingSet.has(date));
  }
};

// Export commonly used constants
export const COMMON_HOLIDAYS = {
  // US Federal Holidays (commonly observed by financial markets)
  US_2024: [
    '2024-01-01', // New Year's Day
    '2024-01-15', // Martin Luther King Jr. Day
    '2024-02-19', // Presidents' Day
    '2024-05-27', // Memorial Day
    '2024-06-19', // Juneteenth
    '2024-07-04', // Independence Day
    '2024-09-02', // Labor Day
    '2024-10-14', // Columbus Day
    '2024-11-11', // Veterans Day
    '2024-11-28', // Thanksgiving
    '2024-12-25'  // Christmas
  ],
  
  // European holidays (ECB calendar)
  EU_2024: [
    '2024-01-01', // New Year's Day
    '2024-03-29', // Good Friday
    '2024-04-01', // Easter Monday
    '2024-05-01', // Labour Day
    '2024-12-25', // Christmas Day
    '2024-12-26'  // Boxing Day
  ]
};

export default dateHelpers;