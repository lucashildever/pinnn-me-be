import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const PLATFORM_URL_PATTERNS: Record<string, RegExp> = {
  spotify:
    /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:user\/[^\/]+\/)?(track|album|playlist|episode|show|artist)\/[a-zA-Z0-9]+/,
  youtube:
    /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[a-zA-Z0-9_-]+/,
  instagram:
    /^https:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[a-zA-Z0-9_-]+/,
  tiktok:
    /^https:\/\/(www\.|vm\.)?tiktok\.com\/(@[a-zA-Z0-9_.]+\/video\/\d+|[a-zA-Z0-9]+)/,
  twitter:
    /^https:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/,
  pinterest:
    /^https:\/\/(www\.|br\.)?pinterest\.(com|com\.br)\/(pin\/\d+|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/,
  twitch:
    /^https:\/\/(www\.)?(twitch\.tv\/videos\/\d+|twitch\.tv\/[a-zA-Z0-9_]+\/clip\/[a-zA-Z0-9_-]+|clips\.twitch\.tv\/[a-zA-Z0-9_-]+|twitch\.tv\/[a-zA-Z0-9_]+)/,
  vimeo:
    /^https:\/\/(www\.|player\.)?vimeo\.com\/(\d+|video\/\d+|channels\/[^\/]+\/\d+)/,
  soundcloud:
    /^https:\/\/(www\.|m\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/,
  facebook:
    /^https:\/\/(www\.|m\.|web\.)?facebook\.com\/(watch\/?\?v=\d+|[a-zA-Z0-9.]+\/(videos|posts)\/\d+|reel\/\d+|share\/(v|r)\/[a-zA-Z0-9_-]+)/,
  linkedin:
    /^https:\/\/(www\.)?linkedin\.com\/(posts|feed\/update|embed\/feed\/update)\/[a-zA-Z0-9_:-]+/,
  'google-maps':
    /^https:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)\/.+/,
  // Note: 'custom' platform has no pattern - accepts any valid URL
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
            // Platform is supported but has no specific URL validation pattern yet
            // Allow it to pass validation
            return true;
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
