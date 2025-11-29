import {
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePinDto } from 'src/pins/dto/create-pin.dto';

export class SharePinGroupResourceDto {
  @IsUUID()
  sharedResourceId: string;

  @IsString()
  sourceMuralId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, {
    message: 'You can add at most 5 additional pins when sharing a pin group',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePinDto)
  additionalPins?: CreatePinDto[];
}
