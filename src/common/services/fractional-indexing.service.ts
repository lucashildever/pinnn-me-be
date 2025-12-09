import { Injectable } from '@nestjs/common';

@Injectable()
export class FractionalIndexingService {
  private readonly BASE_62_DIGITS =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  generateKeyBetween(
    a: string | null | undefined,
    b: string | null | undefined,
  ): string {
    if (a === null || a === undefined) {
      if (b === null || b === undefined) {
        return 'a0';
      }
      return this.generateKeyBefore(b);
    }

    if (b === null || b === undefined) {
      return this.generateKeyAfter(a);
    }

    return this.generateKeyBetweenStrings(a, b);
  }

  /**
   * Generates multiple keys evenly spaced between two bounds
   * @param a Lower bound (or null for start)
   * @param b Upper bound (or null for end)
   * @param count Number of keys to generate
   * @returns Array of keys ordered from a to b
   */
  generateKeysBetween(
    a: string | null | undefined,
    b: string | null | undefined,
    count: number,
  ): string[] {
    if (count <= 0) return [];
    if (count === 1) return [this.generateKeyBetween(a, b)];

    const keys: string[] = [];
    let prev = a;
    for (let i = 0; i < count; i++) {
      const next = i === count - 1 ? b : null;
      const key = this.generateKeyBetween(prev, next);
      keys.push(key);
      prev = key;
    }
    return keys;
  }

  private generateKeyBefore(key: string): string {
    if (key.length === 0) return 'a0';

    const firstChar = key[0];
    const firstCharIndex = this.BASE_62_DIGITS.indexOf(firstChar);

    if (firstCharIndex > 0) {
      return (
        this.BASE_62_DIGITS[firstCharIndex - 1] +
        this.BASE_62_DIGITS[this.BASE_62_DIGITS.length - 1]
      );
    }

    return 'Z' + key;
  }

  private generateKeyAfter(key: string): string {
    if (key.length === 0) return 'a0';

    const lastChar = key[key.length - 1];
    const lastCharIndex = this.BASE_62_DIGITS.indexOf(lastChar);

    if (lastCharIndex < this.BASE_62_DIGITS.length - 1) {
      return key.slice(0, -1) + this.BASE_62_DIGITS[lastCharIndex + 1];
    }

    return key + '0';
  }

  private generateKeyBetweenStrings(a: string, b: string): string {
    const maxLength = Math.max(a.length, b.length);
    const aPadded = a.padEnd(maxLength, '0');
    const bPadded = b.padEnd(maxLength, '0');

    let result = '';
    let carry = false;

    for (let i = 0; i < maxLength; i++) {
      const aIndex = this.BASE_62_DIGITS.indexOf(aPadded[i]);
      const bIndex = this.BASE_62_DIGITS.indexOf(bPadded[i]);

      if (aIndex === bIndex) {
        result += aPadded[i];
        continue;
      }

      const midIndex = Math.floor((aIndex + bIndex) / 2);
      if (midIndex === aIndex) {
        result += aPadded[i];

        continue;
      }

      result += this.BASE_62_DIGITS[midIndex];
      break;
    }

    if (result === a) {
      result += this.BASE_62_DIGITS[Math.floor(this.BASE_62_DIGITS.length / 2)];
    }

    return result;
  }

  /**
   * Validates that an array of order strings is in correct ascending sequence
   * @param orders Array of order strings to validate
   * @returns true if orders are in valid ascending sequence, false otherwise
   */
  validateOrderSequence(orders: (string | undefined | null)[]): boolean {
    if (orders.length === 0) return true;
    if (orders.length === 1) return orders[0] != null;

    for (let i = 0; i < orders.length; i++) {
      const current = orders[i];

      // All orders must be defined
      if (current == null || current === '') return false;

      // Check if current order is greater than previous
      if (i > 0) {
        const previous = orders[i - 1];
        if (previous == null || current <= previous) {
          return false;
        }
      }

      // Check if current order is less than next
      if (i < orders.length - 1) {
        const next = orders[i + 1];
        if (next != null && current >= next) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validates that a single order string is a valid fractional index
   * @param order The order string to validate
   * @returns true if the order is valid, false otherwise
   */
  validateOrder(order: string | undefined | null): boolean {
    // Order must be defined and not empty
    if (order == null || order === '') return false;

    // Order must contain only valid base-62 characters
    for (let i = 0; i < order.length; i++) {
      if (!this.BASE_62_DIGITS.includes(order[i])) {
        return false;
      }
    }

    // Order length should be reasonable (typically 1-10 characters)
    if (order.length > 10) return false;

    return true;
  }

  /**
   * Compares two order strings lexicographically
   * @param a First order string
   * @param b Second order string
   * @returns -1 if a < b, 0 if a === b, 1 if a > b
   */
  compareOrder(a: string, b: string): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
}
