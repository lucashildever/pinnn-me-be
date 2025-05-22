import { Module } from '@nestjs/common';
import { PinGroupPageService } from './pin-group-page.service';
import { PinGroupPageController } from './pin-group-page.controller';

@Module({
  controllers: [PinGroupPageController],
  providers: [PinGroupPageService],
})
export class PinGroupPageModule {}
