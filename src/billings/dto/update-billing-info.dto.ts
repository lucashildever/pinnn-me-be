import { PartialType } from '@nestjs/mapped-types';
import { CreateBillingInfoDto } from './create-billing-info.dto';

export class UpdateBillingInfoDto extends PartialType(CreateBillingInfoDto) {}
