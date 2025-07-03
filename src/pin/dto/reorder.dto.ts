import {
  IsEnum,
  Matches,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class ReorderDto {
  @IsEnum(['pin', 'card'])
  @IsNotEmpty()
  type: 'pin' | 'card';

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z_-]+$/, {
    message:
      'newOrder must contain only alphanumeric characters, hyphens or underscores',
  })
  @MinLength(1)
  @MaxLength(10)
  newOrder: string;
}
