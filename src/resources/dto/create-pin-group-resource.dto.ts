import {
  IsArray,
  IsString,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePinDto } from 'src/pins/dto/create-pin.dto';

export class CreatePinGroupResourceDto {
  @IsString()
  @MaxLength(45, { message: 'Group name must not exceed 45 characters' })
  groupName: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one pin is required in a pin group' })
  @ArrayMaxSize(5, { message: 'A pin group can have at most 5 pins' })
  @ValidateNested({ each: true })
  @Type(() => CreatePinDto)
  pins: CreatePinDto[];
}
