import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';

export class GroupPinsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(2)
  resourceIds: string[];

  @IsString()
  @IsOptional()
  groupName?: string;
}
