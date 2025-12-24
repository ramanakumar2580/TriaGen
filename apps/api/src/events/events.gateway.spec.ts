import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        // 🔥 Mock JwtService (Required for Socket Auth)
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(() => ({ sub: 'user-123', teamId: 'team-1' })),
          },
        },
        // 🔥 Mock ConfigService
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'JWT_SECRET') return 'test_secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
