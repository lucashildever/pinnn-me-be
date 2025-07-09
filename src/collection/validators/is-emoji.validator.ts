import { registerDecorator, ValidationOptions } from 'class-validator';
import emojiRegex from 'emoji-regex';

export function IsEmoji(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEmoji',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          const regex = emojiRegex();
          const matches = Array.from(value.matchAll(regex));

          return matches.length === 1 && matches[0][0] === value;
        },
        defaultMessage() {
          return 'unicode must be a single valid emoji';
        },
      },
    });
  };
}
