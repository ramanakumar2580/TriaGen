import { Test, TestingModule } from '@nestjs/testing';
import { EscalationService } from './escalation.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('EscalationService', () => {
  let service: EscalationService;

  // 🔥 Mock the BullMQ Queue
  // We only need to mock the methods we use (e.g., 'add', 'remove')
  const mockQueue = {
    add: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        // 💉 Inject the Mock Queue using the correct Token
        {
          provide: getQueueToken('escalation'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Optional: Add a test to verify adding a job works
  it('should add a job to the queue', async () => {
    await service.scheduleEscalation('incident-123'); // Assuming this method exists
    expect(mockQueue.add).toHaveBeenCalledWith(
      'check-escalation',
      { incidentId: 'incident-123' },
      expect.any(Object), // For delay options
    );
  });
});
