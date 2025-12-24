import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateFormSubmissionDto {
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
