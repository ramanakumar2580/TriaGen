import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from './events.gateway';

describe('EventsService', () => {
  let service: EventsService;

  // 🔥 Mock Dependencies
  const mockPrismaService = {
    incidentEvent: {
      create: jest.fn(),
    },
  };

  const mockEventsGateway = {
    server: {
      to: jest.fn().mockReturnThis(), // Chainable
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        // 💉 Provide Mocks
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
