import { IsUUID, IsNotEmpty } from 'class-validator';

export class PinResourceDto {
  @IsUUID()
  @IsNotEmpty()
  resourceId: string;
}
