import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const PLATFORM_URL_PATTERNS: Record<string, RegExp> = {
  spotify:
    /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:user\/[^\/]+\/)?(track|album|playlist|episode|show|artist)\/[a-zA-Z0-9]+/,
  // Add later:
  // youtube: /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+/,
  // soundcloud: /^https:\/\/(www\.)?soundcloud\.com\/.+\/.+/,
  // vimeo: /^https:\/\/(www\.)?vimeo\.com\/\d+/,
};

export function IsPlatformUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPlatformUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(url: string, args: ValidationArguments) {
          const obj = args.object as any;
          const platform = obj.platform;

          if (!platform) {
            return true;
          }

          const pattern = PLATFORM_URL_PATTERNS[platform];
          if (!pattern) {
            return false;
          }

          return pattern.test(url);
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const platform = obj.platform;

          if (!PLATFORM_URL_PATTERNS[platform]) {
            return `Plataform '${platform}' is not supported!`;
          }

          return `Provided '${platform}' URL is not valid!`;
        },
      },
    });
  };
}
