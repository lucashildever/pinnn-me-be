import {
    IsEnum,
    IsNotEmpty,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ResourceTypes } from '../constants/resource-types.constant';
import { ResourceType } from '../types/resource-type.type';
import { CreatePinDto } from 'src/pins/dto/create-pin.dto';

export class CreateResourceDto {
    @IsEnum(ResourceTypes)
    @IsNotEmpty()
    type: ResourceType;

    @ValidateNested()
    @Type(() => CreatePinDto)
    @IsNotEmpty()
    data: CreatePinDto;
}
