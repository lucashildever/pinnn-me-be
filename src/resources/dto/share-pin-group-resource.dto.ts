import {
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Transform, plainToInstance } from 'class-transformer';
import { CreatePinDto } from 'src/pins/dto/create-pin.dto';
import { SharePinDto } from 'src/pins/dto/share-pin.dto';

export class SharePinGroupResourceDto {
  @IsUUID()
  sharedResourceId: string;

  @IsString()
  sourceMuralId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((item) => {
      if (item.sharedPinId) {
        return plainToInstance(SharePinDto, item);
      }
      return plainToInstance(CreatePinDto, item);
    });
  })
  additionalPins?: (CreatePinDto | SharePinDto)[];
}
