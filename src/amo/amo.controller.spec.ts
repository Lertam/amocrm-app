import { Test, TestingModule } from '@nestjs/testing';
import { AmoController } from './amo.controller';

describe('AmoController', () => {
  let controller: AmoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmoController],
    }).compile();

    controller = module.get<AmoController>(AmoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
