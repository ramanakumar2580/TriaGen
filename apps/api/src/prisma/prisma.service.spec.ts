import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  // 🔥 1. Define variables to hold the spies
  let connectSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // 🔥 2. Assign the spies to variables so we can check them safely later
    connectSpy = jest
      .spyOn(service, '$connect')
      .mockImplementation(async () => {});
    disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockImplementation(async () => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on module init', async () => {
    await service.onModuleInit();
    // 🔥 3. Assert on the spy variable, NOT the method property
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should disconnect on module destroy', async () => {
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
