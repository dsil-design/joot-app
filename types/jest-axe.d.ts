declare namespace jest {
  interface Matchers<R> {
    /**
     * Custom Jest matcher for jest-axe accessibility testing
     * Checks that the given element has no accessibility violations
     */
    toHaveNoViolations(): R;
  }
}

// Also extend the default expect interface 
declare module 'jest-axe' {
  export function axe(container: Element | Document, options?: any): Promise<any>;
  export function toHaveNoViolations(results: any): { pass: boolean; message(): string };
}
