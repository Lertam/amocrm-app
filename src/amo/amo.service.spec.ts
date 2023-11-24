import { Test, TestingModule } from '@nestjs/testing';
import { AmoService } from './amo.service';

describe('AmoService', () => {
  let service: AmoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmoService],
    }).compile();

    service = module.get<AmoService>(AmoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
