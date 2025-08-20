import 'jest'
import { AxeResults } from 'jest-axe'

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }

    interface ExpectExtendMap {
      toHaveNoViolations: (results: AxeResults) => {
        pass: boolean
        message(): string
      }
    }
  }
}