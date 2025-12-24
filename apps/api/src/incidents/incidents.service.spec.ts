import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../prisma/prisma.service';
import { EscalationService } from '../escalation/escalation.service';
import { EventsService } from '../events/events.service';
import { FilesService } from '../files/files.service';
import { EventsGateway } from '../events/events.gateway';

describe('IncidentsService', () => {
  let service: IncidentsService;

  // 🔥 Mock all 5 Dependencies
  const mockPrismaService = {
    incident: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    team: { findUnique: jest.fn() },
    attachment: { findMany: jest.fn() },
  };

  const mockEscalationService = {
    scheduleEscalation: jest.fn(),
    cancelEscalation: jest.fn(),
  };
  const mockEventsService = {
    sendTeamAlert: jest.fn(),
    createEvent: jest.fn(),
  };
  const mockFilesService = { deleteFile: jest.fn() };
  const mockEventsGateway = {
    server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        // 💉 Inject Mocks
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EscalationService, useValue: mockEscalationService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: FilesService, useValue: mockFilesService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
