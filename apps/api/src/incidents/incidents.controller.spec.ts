import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

describe('IncidentsController', () => {
  let controller: IncidentsController;

  // 🔥 Mock the Service
  // We mock the methods that the Controller actually calls.
  const mockIncidentsService = {
    create: jest.fn(() => Promise.resolve({ id: '1', title: 'Test Incident' })),
    findAll: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve({ id: '1' })),
    update: jest.fn(() => Promise.resolve({ id: '1' })),
    remove: jest.fn(() => Promise.resolve({ id: '1' })),
    addEvent: jest.fn(() => Promise.resolve({ id: 'evt-1' })),
    updateEvent: jest.fn(() => Promise.resolve({ id: 'evt-1' })),
    removeEvent: jest.fn(() => Promise.resolve({ success: true })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentsController],
      providers: [
        {
          provide: IncidentsService,
          useValue: mockIncidentsService, // 💉 Inject the Mock here
        },
      ],
    }).compile();

    controller = module.get<IncidentsController>(IncidentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
