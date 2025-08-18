export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  async waitForNextSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    
    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // 100ms buffer
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requests.push(now);
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }
  
  getResetTime(): Date {
    if (this.requests.length === 0) {
      return new Date();
    }
    
    const oldestRequest = Math.min(...this.requests);
    return new Date(oldestRequest + this.windowMs);
  }
}