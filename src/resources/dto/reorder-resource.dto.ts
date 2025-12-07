import {
  IsUUID,
  Matches,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class ReorderResourceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z_-]+$/, {
    message:
      'newOrder must contain only alphanumeric characters, hyphens or underscores',
  })
  @MinLength(1)
  @MaxLength(10)
  newOrder: string;

  @IsUUID()
  @IsOptional()
  previousId?: string;

  @IsUUID()
  @IsOptional()
  nextId?: string;
}
