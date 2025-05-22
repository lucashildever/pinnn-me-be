import { Test, TestingModule } from '@nestjs/testing';
import { PinGroupPageController } from './pin-group-page.controller';
import { PinGroupPageService } from './pin-group-page.service';

describe('PinGroupPageController', () => {
  let controller: PinGroupPageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PinGroupPageController],
      providers: [PinGroupPageService],
    }).compile();

    controller = module.get<PinGroupPageController>(PinGroupPageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
