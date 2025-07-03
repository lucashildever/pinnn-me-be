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
}
