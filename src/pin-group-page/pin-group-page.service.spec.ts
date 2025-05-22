import { Test, TestingModule } from '@nestjs/testing';
import { PinGroupPageService } from './pin-group-page.service';

describe('PinGroupPageService', () => {
  let service: PinGroupPageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinGroupPageService],
    }).compile();

    service = module.get<PinGroupPageService>(PinGroupPageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
